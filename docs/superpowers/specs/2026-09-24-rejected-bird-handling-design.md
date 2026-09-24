# Rejected Bird Handling — Design

**Date:** 2026-09-24
**Status:** Approved, not yet implemented
**Scope:** spans two repos — `poultry-solution` (mobile) and `new-hope` / `feed-reminder-up` (backend + web)

## Problem

A rejected bird is culled: it leaves the house, earns no money, and counts as a loss
exactly like mortality. Only `sale_events.birds_rejected` and
`sale_reports.birds_rejected` store that fact. Everything above them re-derives cycle
totals by hand, and several sites get it wrong.

Two failures, both reported against the same 1000-bird cycle
(sale 1: 300 sold, 45 rejected, 60 mortality, 595 remaining; sale 2: 595 sold):

1. The sale report copy text folded earlier sales' rejected birds into "Previously
   Sold" — it read 345 instead of 300 sold and 45 rejected. Fixed in
   poultry-solution#3 and new-hope#115.
2. `sale_metrics.survival_rate` and `epi` are computed from the **latest sale's**
   rejected count, so the 45 rejects from sale 1 are stored as survivors. The cycle
   screen shows 89.5% while the saved Production Report row says 94.0%. Still open —
   this design fixes it.

Underneath both: `cycles.birds_sold` and `cycle_history.birds_sold` do not mean birds
sold. They mean birds *out* — sold plus rejected. Neither table stores rejects, and
`sale_metrics` has no column for them at all.

## Decisions

| Question | Decision |
|---|---|
| Cycle-level model | Rename `birds_sold` → `birds_out`, add `birds_rejected` |
| Already-wrong stored metrics | Recompute every cycle and history once |
| Shared arithmetic module | **Out of scope** — fix each site in place |
| What a rejected bird is | Culled, no revenue, counts as a loss like mortality |
| `averageAge` numerator/denominator mismatch | **Leave as is** |
| Web report copy text | Match the mobile format exactly |
| Old mobile clients | Keep a deprecated `birdsSold` alias in API responses |

Two of these are deliberate omissions, recorded so they are not mistaken for oversights:

- **No shared module.** Each site is fixed where it stands. Nothing structurally
  prevents this class of bug from returning.
- **`averageAge` stays inconsistent.** `sale-metrics-service.ts:188` accumulates
  bird-days as `(birdsSold + birdsRejected) × age` while line 192 divides by
  `totalBirdsSold` alone. Age stays inflated for cycles with rejects, and since age
  divides into EPI, stored EPI reads slightly low for those cycles.

## 1. Model and migration

One Drizzle migration:

| Table | Change |
|---|---|
| `cycles` | rename `birds_sold` → `birds_out`; add `birds_rejected int not null default 0` |
| `cycle_history` | same rename, same new column |
| `sale_metrics` | add `total_birds_rejected int not null default 0` |

`sale_events.birds_rejected` and `sale_reports.birds_rejected` are unchanged. They are
the source every derived figure is rebuilt from.

Backfill, in the same migration:

```sql
UPDATE cycles SET birds_rejected = COALESCE(
  (SELECT SUM(birds_rejected) FROM sale_events
   WHERE sale_events.cycle_id = cycles.id), 0);

UPDATE cycle_history SET birds_rejected = COALESCE(
  (SELECT SUM(birds_rejected) FROM sale_events
   WHERE sale_events.history_id = cycle_history.id), 0);
```

The rename moves no data — `birds_out` holds exactly what `birds_sold` held — so no
existing calculation changes value as a result of this migration.

Derived values after the change:

```
sold      = birds_out - birds_rejected
remaining = doc - mortality - birds_out
survival  = (doc - mortality - birds_rejected) / doc * 100
```

### Compatibility with released mobile clients

v1.0.59 is installed on phones and reads `cycle.birdsSold` from `cycles.listActive`
and the cycle detail endpoint. If that response field disappears, those apps read
`undefined → 0`, which overstates live-bird counts, un-greys the Edit DOC / Edit Age /
Correct Mortality actions on cycles that have already sold, and lets the sell modal
accept an impossible sale.

None of that corrupts data — the server re-validates independently at
`officer/sales.ts:302-318` and `officer/cycles.ts:1263` — but the screens lie and the
rejections confuse.

Therefore: routers keep emitting `birdsSold` alongside `birdsOut`, carrying the **old**
meaning (sold + rejected), marked `@deprecated`. Remove it only when cutting off old app
versions is acceptable.

## 2. Stored metrics

`sale-metrics-service.ts:197` currently reads:

```ts
const totalBirdsRejected = Number(latestSaleData?.birdsRejected) || 0;
```

It becomes a sum across every sale of the cycle, taking each sale's selected report:

```ts
const totalBirdsRejected = sales.reduce(
  (n, s) => n + (Number((s.selectedReport ?? s).birdsRejected) || 0), 0);
```

That one value feeds three stored figures, which therefore correct together:

- `survivalRate` — via `calculateSR(doc, mortality, rejected)`
- `averageWeight` — via the `survivors` denominator at line 201
- `epi` — via both of the above

`total_birds_rejected` is written to `sale_metrics` so the Production Report can state
the figure instead of having it disappear into the survival rate.

### Backfill

A one-off script walks every cycle and every history and calls the existing
`SaleMetricsService.recalculateForCycle()` — the same function already invoked on sale
create, adjust and delete, so there is no second implementation of the maths to keep in
step. Batched, idempotent, and it prints every cycle whose survival rate or EPI moved,
with the delta.

Order matters: migration → deploy service fix → run backfill. Running the backfill
before the fix rewrites every row with the same wrong number.

Expect stored survival rate and EPI to **fall** for any cycle that had rejects in a
non-final sale. The example cycle drops 4.5 points of survival. Some historical
Production Report figures will therefore change.

## 3. Display

Wherever a cycle-level figure appears, sold and rejected are separate, and nothing
labelled "Sold" includes a rejected bird. Rejected rows render only when the count is
above zero, so cycles without rejects look exactly as they do today.

| Surface | Change |
|---|---|
| Cycle detail (mobile) | Done in poultry-solution#3 — Sold 300, Rejected 45 |
| `components/cycles/cycle-card.tsx:55` | `soldValue` reads `birdsRejected`, shows sold-only; badge gains a rejected count |
| Live-bird counts — overview, recent-activity, dashboard export | Maths unchanged; they correctly use birds-out. Field name moves only |
| Admin and management cycle lists (web) | Same split as the mobile cycle screen |
| Production Report | New Rejected column |

The mobile sale report copy text stays as shipped in poultry-solution#3:
`Previously Sold` / `Previously Rejected` / `Today's Sale` / `Rejected`.

The web template at `modules/cycles/ui/components/cycles/sales-history-card.tsx:58`
(`generateReportText`, whose `Total Sold` line is 94) is
an older format — it prints `Total Sold` with this sale's number, has no `DOC In` line
and no rejected figures at all. It is replaced with the mobile format verbatim, so a
farmer receives the same report regardless of which app the officer copied from.

## 4. Verification and rollout

The backend has no test framework and this design does not introduce one. Verification
is an invariant script, `scripts/verify-bird-math.ts`, run with `tsx` — the tooling
`db:reset` already uses, no new dependencies. Read-only. For every cycle and history it
asserts:

```
doc                       == mortality + sold + rejected + remaining
cycles.birds_rejected     == SUM(sale_events.birds_rejected)
sale_metrics.survival_rate == (doc - mortality - rejected) / doc * 100
```

Failures print the cycle, the farmer, and both numbers.

### Rollout

1. Migration — rename, add columns, backfill `birds_rejected` from `sale_events`.
2. Deploy backend and web together, with the deprecated `birdsSold` alias in responses.
3. Run `verify-bird-math.ts` — record the before picture.
4. Run the metrics backfill.
5. Run the verifier again — expect clean.
6. Ship the mobile update reading `birdsOut` / `birdsRejected`.

### Manual QA

The cases that actually broke:

- Two-sale cycle with rejects in sale 1 only — the reported case.
- Three-sale cycle with rejects in sales 1 and 3 — the case the client-side fallback
  cannot split.
- A sale whose report was adjusted to a different rejected count, checked against the
  version switcher.

### Rollback

Steps 1–2 are additive apart from the rename, so reverting means restoring the column
name. The backfill is idempotent and rebuilds from `sale_events`, which this design
never modifies, so re-running it always reconstructs the same answer.

## Already shipped

Fixed before this design, in review:

- **new-hope#115** — per-sale `previousBirdsSold` / `previousBirdsRejected` on both sale
  list paths; `performance-analytics-service` survival rate summing rejects across all
  sales instead of reading the latest; web adjust modal remaining-birds maths.
- **poultry-solution#3** — report copy text splitting previously sold from previously
  rejected; adjust modal available-birds guard; cycle screen sold/rejected split;
  exports reading the selected report; Sales Ledger export unwrapping its paginated
  response.
