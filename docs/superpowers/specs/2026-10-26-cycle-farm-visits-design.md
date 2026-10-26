# Farm Visits on the Cycle Details Page - Design

**Date:** 2026-10-26
**Status:** Approved by user, implemented without a separate plan document (small, two-repo change)
**Scope:** `feed-reminder-up` (service, schemas, two routers) and `poultry-solution` (`app/cycle/[id].tsx` plus one new component). Builds on `2026-10-26-farmer-visit-reports-design.md`.

## Goal

On the cycle details page, show how many farm visits a cycle has and when it was last visited, and list the cycle's visit reports in an accordion with the same actions as the Farmer Visits screen.

## Decisions

| Question | Decision |
|---|---|
| Actions inside the accordion | Tap to edit, Copy, Delete, plus a "New visit" button (active cycles only). Ended cycles are view and copy only |
| Position | Between "Sales History" and "Other Cycles" |
| Summary rows | "Farm Visits" (count) and "Last Visited" (date and "N days ago", or "Never") after Mortality in Cycle Summary |
| Ended cycles | Supported. Reports follow the cycle into history, so lookups match either `cycle_id` or `history_id` |
| Non-Pro users | Summary rows hidden. Accordion header shows a PRO badge and opens the upgrade screen. Endpoints stay Pro-gated |

## Backend

- `listInputSchema` gains optional `cycleRef`: an id that matches `farmer_visit_reports.cycle_id` OR `history_id`. Ids are UUIDs, so one id can never match both. The caller's existing scope (org, plus own farmers for officers) still applies.
- New `farmerVisits.cycleSummary({ cycleRef })` on the officer and management routers returns `{ count, lastVisitDate }` from one aggregate query (`count(*)`, `max(visit_date)`), with the same scope rules. Both calls are Pro-gated.
- No schema change and no `db:push`.

## Mobile

- `app/cycle/[id].tsx`:
  - `useFarmerVisitApi()` and a `cycleSummary` query run with the other hooks, before the early returns, enabled only for Pro users.
  - Two rows added to Cycle Summary.
  - New `'visits'` accordion between Sales and Other Cycles, using the same `openSection` / `renderSection` rendering pattern and loader.
- `components/farmer-visits/cycle-visits-section.tsx` (new): infinite list filtered by `cycleRef`, "New visit" button, `VisitCard` items (edit on tap, copy, delete), loading, empty ("No visits yet") and error states. Create, edit and delete invalidate the list and the summary.
- A non-Pro user opening the accordion sees `ProBlocker` and no request is made.

## Out of scope

Pagination beyond the existing infinite list, exporting all visits for a cycle at once, and a visits chart.
