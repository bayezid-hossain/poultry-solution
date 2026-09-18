# List Pagination + DOC Cycles Starting at Day 0 — Design Spec

**Date:** 2026-09-16
**Projects:** feed-reminder-up (API), poultry-solution (mobile UI)
**Scope:** four independent fixes — two farmer pickers, sales history paging, DOC-order cycle age

---

## Context

Four unrelated complaints, grouped because they were reported together. Each is independently shippable.

1. **Feed order farmer picker shows only a few farmers.** [`components/orders/create-feed-order-modal.tsx`](../../../components/orders/create-feed-order-modal.tsx) queries `officer.farmers.listWithStock` with `page: 1, pageSize: 20` and no way to fetch more. Search reaches the server so any farmer is findable by name, but browsing stops after the first 20 by alphabetical order.
2. **Cycle create farmer picker has no search.** [`components/cycles/cycle-modal.tsx`](../../../components/cycles/cycle-modal.tsx) uses the same endpoint with `pageSize: 100` and renders a plain list with no search input.
3. **Sales history stops around June/July.** [`app/(drawer)/(tabs)/sales.tsx`](../../../app/(drawer)/(tabs)/sales.tsx) calls `getRecentSales({ limit: 100 })`; the procedure caps `limit` at 100 and filters search in memory over at most 200 rows. Older sales are unreachable.
4. **DOC order confirmation produces day-1 cycles on placement day.** Confirm inserts `age: 0`, then `updateCycleFeed` recomputes `age = Math.max(1, daysSinceCreatedAt + 1)` and writes 1 back. Officers expect the arrival day to be day 0 and the next day to be day 1.

---

## Audit findings that shaped item 4

Verified against the production database (read-only) and both codebases:

- All 164 active cycles store `age = days_since_created_at + 1` exactly. Zero drift.
- `age` has a single writer: `updateCycleFeed` in `modules/cycles/server/services/feed-service.ts`, run by the daily Vercel cron (`0 0 * * *`) and forced by most mutations.
- Sale ages: 1060 sale events (25 with NULL age), 1246 reports (75 NULL), average sale age 33.07, min 21, max 72.
- 33 active cycles are older than 40 days (feed schedule caps there); 7 history rows have `age = 1` with no birds sold (junk placements).
- Four places invert age back into a start date and assume the 1-based convention: `trpc/routers/officer/sales.ts:259`, `:674`, `:1887-1891`, and `trpc/routers/officer/cycles.ts:1387`. A mismatch there silently rewrites `cycles.createdAt`, cycle logs and prior sale dates by a day.
- Pre-existing inconsistencies found but **out of scope** for this change: single cycle create backdates by `age - 1` while bulk create backdates by `age`; cycle age advances at 00:00 UTC (06:00 Bangladesh time) because the cron and all date math run in UTC.

A global switch to 0-based age was considered and rejected — it touches all four inversion sites, every age validator, the feed curve, and splits historical EPI onto a second scale. The chosen mechanism confines the change to the DOC confirm path.

---

## 1 + 2. Farmer pickers (both repos)

### API — `trpc/routers/officer/farmers.ts`, `listWithStock`

Add an optional `cursor` (page number) to the input and return `nextCursor` alongside the existing payload:

- `cursor` defaults to `page` when absent, so every current caller is unaffected.
- `nextCursor = cursor + 1` when `cursor * pageSize < total`, otherwise `null`.

The existing `page`/`pageSize`/`search`/`total` contract stays exactly as it is; this is additive.

### Mobile — new `components/farmers/farmer-picker-list.tsx`

One shared component used by both modals. Responsibilities:

- Owns the search input and its debounce (match the 300ms debounce already used in `sales.tsx`).
- Runs `trpc.officer.farmers.listWithStock.useInfiniteQuery` with `getNextPageParam: (last) => last.nextCursor`.
- Flattens pages into a `FlatList`, fetches the next page on `onEndReached` when `hasNextPage && !isFetchingNextPage`, renders a footer spinner while fetching and a distinct empty state for "no farmers" vs "no match".

Row rendering is supplied by the caller via a `renderRow` prop, because the two call sites differ:

- Feed order modal: multi-select with stock figures and a selected-state check.
- Cycle create modal: single select, dismisses the picker on choice.

Both modals delete their local list/query code and mount this component. The cycle create picker gains search for the first time.

**Boundary:** the component knows nothing about orders or cycles — it takes `orgId`, a `renderRow`, and an `onSelect`, and hands back farmer records.

---

## 3. Sales history pagination (both repos)

### API — `officer.sales.getRecentSales` and `management.sales.getRecentSales`

Convert both to keyset pagination:

- **Input:** `{ cursor?: { saleDate: Date, id: string }, limit: number (default 20, max 100), search?: string }` — plus `orgId`/`officerId` on the management variant, unchanged.
- **Order:** `saleDate DESC, id DESC`.
- **Page predicate:** `(saleDate, id) < (cursor.saleDate, cursor.id)` when a cursor is supplied.
- **Output:** `{ items, nextCursor }`, where `nextCursor` is built from the last row of a full page and `null` when the page came back short.

Search moves out of the in-memory filter in `appendCycleContextToSales` and into SQL, covering the same three fields it covers today — farmer name (reached through `cycle → farmer` and `history → farmer`), `saleEvents.party`, `saleEvents.location`. The in-memory `search`/`limit` arguments to `appendCycleContextToSales` are removed; that helper goes back to only decorating the rows it is given.

Cycle context stays correct under paging: `appendCycleContextToSales` fetches **all** events for the cycle/history groups present in the page, so cumulative weight, birds sold, rejected birds, FCR and EPI do not depend on which page a sale lands on.

### Mobile — `app/(drawer)/(tabs)/sales.tsx`

Both the officer and management branches become `useInfiniteQuery`; pages are flattened for the list; `onEndReached` fetches the next page with a footer spinner. The existing 300ms debounced search and officer filter keep working — they are simply passed through as query inputs, and changing either resets the infinite query.

The Today/Weekly/Monthly chips stay client-side. Results are ordered `saleDate DESC`, so each of those filters selects a prefix of the list: if a sale matching "today" exists, it is in the newest rows already loaded, and no matching row can hide behind an unloaded page.

---

## 4. DOC order cycles start at day 0 (backend only)

**Mechanism:** the cycle is dated one day after the placement date, and the age floor drops to 0. Age stays 1-based arithmetic everywhere, so every age↔date inversion remains correct by construction — no new column, no per-cycle convention flag.

### `trpc/routers/officer/doc-orders.ts` — `confirm`

- Keep validating the officer's chosen placement date as today (40-day limit, no future dates). Validation applies to the **placement date**, not the shifted date.
- Insert the cycle with:
  - `createdAt = placementDate + 1 day`
  - `officialInputDate = placementDate` (the real arrival date, recorded rather than inferred)
  - `age: 0`
- The creation `cycleLogs` note records the actual placement date.

### `modules/cycles/server/services/feed-service.ts`

One line: `Math.max(1, …)` becomes `Math.max(0, …)` in the `currentAge` computation. Manually created cycles are unaffected — their `createdAt` is never in the future, so `diff ≥ 0` and `age ≥ 1` as today.

### Mortality date guards — `trpc/routers/officer/cycles.ts:634` and `:993`

Both currently reject a log dated before `cycle.createdAt`. With the cycle dated a day ahead, arrival-day deaths would be rejected. Both compare against `officialInputDate ?? createdAt` instead, so arrival-day mortality logs normally and manual cycles behave exactly as before.

### Accepted consequences (decided, not oversights)

- **Feed curve runs one day behind for DOC cycles.** On the arrival day the schedule lookup returns day 0 (0 g); at day 32 a DOC cycle is entitled to 2356 g/bird instead of 2496 — roughly 3.7 bags on 1320 birds.
- **Monthly DOC placement report buckets by `cycles.createdAt`** and stays that way, so a placement on the last day of a month counts in the following month.
- **Sale age and EPI.** A DOC cycle sold on its 33rd day records sale age 32, so its EPI reads about 3% higher than an equivalent manually created cycle. Historical records are untouched.

---

## Verification

Neither repo has a test harness, so verification is type checks plus a manual pass.

- `npx tsc --noEmit` in both repos, clean.
- Feed order picker: scroll past 20 farmers, confirm more load; search a farmer late in the alphabet and select them.
- Cycle create picker: search box present, filters, selection still creates the cycle.
- Sales tab: scroll back past July; search by farmer name, buyer and location and confirm matches appear from beyond the first page; open a sale from a later page and check remaining birds and FCR/EPI match what the cycle screen shows.
- DOC confirm: confirm an order dated today, check the cycle reads age 0 today; log mortality dated today on it and confirm it is accepted.
- Manual cycle create on the same day still reads age 1.

---

## Out of scope

- Global 0-based age for manually created cycles, history, or past sale records.
- The single-vs-bulk create backdating discrepancy.
- The 06:00 local age rollover caused by UTC date math.
- Any management-side capability not already present.
