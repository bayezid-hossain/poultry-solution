# Farmer Visit Reports — Design

**Date:** 2026-10-26
**Status:** Approved, not yet implemented
**Scope:** spans two repos — `poultry-solution` (mobile) and `feed-reminder-up` (backend: Drizzle schema, migration, tRPC)

## Problem

Officers visit farms and send a hand-typed "running farm visit" message (age, mortality, avg weight
vs standard, FCR, feed intake / running / stock, litter, disease, medicine, suggestions). Nothing is
stored, standard values are looked up by hand, FCR is computed by hand, and cycle mortality is not
updated from what the officer observed. This feature stores the report, computes the derived values,
generates the message with a copy button, and keeps cycle mortality in sync.

## Decisions

| Question | Decision |
|---|---|
| Standard values scope | One global table, ignore strain. Days 0–40, clamp above 40 |
| Days 35–40 | Extrapolated from the supplied table's trend; marked as such in the seed file |
| Avg FCR | `(sum of running bags across all feed types × 50) ÷ (avg wt kg × live birds)` |
| Mortality | User enters Today and Total (Total prefilled from the cycle). Save sets cycle mortality to Total |
| Lifecycle | Edit + delete. One report per cycle per date; saving on an existing date opens it for edit |
| Feed types | Dynamic: B1, B2 by default, user can add/remove types; all totals sum over whatever exists |
| Suggestions | Editable text, prefilled with the default sample text |
| Age | Prefilled from cycle start and date, editable. Std values refetched when date **or** age changes |
| Date | Defaults to today; must be ≥ cycle start and not in the future |

## 1. Data (one Drizzle migration in `db/schema.ts`)

**`standard_values`** (global, seeded)

| column | type |
|---|---|
| `day` | int PK, 0–40 |
| `daily_feed_g` | int — grams per bird per day |
| `body_weight_g` | int |
| `fcr` | decimal, null on day 0 |

Days 0–35 come from the supplied Ross table (36 rows). Days 36–40 are extrapolated:

| day | daily_feed_g | body_weight_g | fcr |
|---|---|---|---|
| 36 | 195 | 2291 | 1.548 |
| 37 | 201 | 2392 | 1.566 |
| 38 | 207 | 2494 | 1.584 |
| 39 | 213 | 2597 | 1.602 |
| 40 | 219 | 2701 | 1.620 |

Age above 40 clamps to day 40. Day 0 has no FCR.

**`farmer_visit_reports`**

| column | notes |
|---|---|
| `id` | text PK, uuid default |
| `organization_id` | scoping, same as other tables |
| `cycle_id` | FK → `cycles`, cascade delete |
| `farmer_id` | FK → farmer |
| `created_by` | FK → user |
| `visit_date` | date |
| `age` | int, as entered on the form |
| `doc_count`, `strain` | snapshots from the cycle |
| `today_mortality`, `total_mortality` | int |
| `avg_weight_g` | int |
| `std_weight_g`, `std_fcr` | snapshots of the standard used at save |
| `avg_fcr` | decimal, computed server-side |
| `feed_lines` | jsonb `[{ type, intake, running, stock }]` |
| `litter`, `disease`, `medicine`, `suggestions` | text |
| `created_at`, `updated_at` | timestamps |

Unique index on `(cycle_id, visit_date)`.

## 2. Calculations (server is the single source of truth)

- `liveBirds = doc − total_mortality − rejected birds already out of the cycle`
- `avg_fcr = (Σ running × 50) / (avg_weight_g / 1000 × liveBirds)`; 0 if weight or live birds is 0
- `std = standard_values[clamp(age, 0, 40)]`
- Totals for intake, running and stock are `Σ` over `feed_lines`
- Suggested age = `max(0, calendar days from cycle start to visit_date + 1)`, computed on the mobile client

## 3. Cycle side effect

On save, in one transaction with the report upsert, set `cycles.mortality = total_mortality` and
write a `cycle_logs` entry (previous value, new value, note referencing the visit report), the same
way "Correct mortality" does.

- **Edit:** the cycle is only re-set when this report is the cycle's latest by `visit_date`.
  Editing an older report never overwrites newer data.
- **Delete:** no rollback of the cycle; the log entry stays valid.
- Creating a report requires an active cycle. Reports of ended cycles remain viewable.

## 4. API (tRPC, officer and management routers, scoped like existing cycle queries)

- `farmerVisit.list({ search, dateFrom, dateTo, sort: "date" | "farmer", order, cursor })`
- `farmerVisit.getPrefill({ cycleId, date })` → farmer, location, DOC, strain, cycle start date,
  current cycle mortality, std for that age, and the existing report for that cycle+date if any
- `farmerVisit.getStandard({ age })` → std wt / std FCR for refetch on date or age change
- `farmerVisit.save` (upsert on cycle+date), `farmerVisit.get`, `farmerVisit.delete`

## 5. Mobile UI

- **Drawer:** "Farmer Visit Reports" in both the officer and management Reports sections of
  `components/custom-drawer-content.tsx`, route `/(drawer)/farmer-visits`.
- **List screen:** search by farmer name, date-range filter, sort by date or farmer name
  (asc/desc). Cards show date, farmer, age, avg wt, avg FCR, with copy and delete. Tap opens edit.
- **Cycle menu:** new "Farmer Visit" action (`CycleAction` and the menu in `app/cycle/[id].tsx`)
  opening `/cycle/[id]/farmer-visit`.
- **Form:**
  - read-only header: farmer, location, DOC, strain
  - date picker (default today), age (prefilled, editable)
  - today and total mortality, avg weight
  - feed lines: B1 and B2 rows, "Add feed type", remove row; each row has intake, running, stock
  - read-only std wt and std FCR, refetched when date or age changes
  - read-only live avg FCR preview (server value is authoritative)
  - litter, disease, medicine, suggestions (prefilled default text, editable)
  - Copy button
- **Copy text:** one shared formatter produces the message in the agreed template. Per-section
  totals plus one line per feed type, counts zero-padded to two digits ("09 bags"). Used by the
  form and by list cards.

## 6. Edge cases and testing

- Age below 0 → std fields blank; age above 40 → day 40 values.
- Backend tests: FCR math, std clamping, upsert uniqueness, mortality side effect for
  create / edit-latest / edit-older, date validation.
- Mobile: snapshot test of the formatter against the sample message with 2 and 3 feed types.

## Out of scope

- Per-strain standards and an admin screen for editing them
- Photos or attachments on a report
- Rolling back cycle mortality when a report is deleted
