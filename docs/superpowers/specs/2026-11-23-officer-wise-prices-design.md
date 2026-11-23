# Officer-Wise Prices - Design

**Date:** 2026-11-23
**Status:** Design agreed with the user, to be reviewed before implementation
**Scope:** `feed-reminder-up` (schema, price lookup, two routers, web table) and `poultry-solution` (price screens, drawer item, launch prompt)

## Problem

DOC price, feed price and base selling price live in `price_policies`, one timeline per organization. Every officer's sales and profit numbers use the organization's prices. Each officer actually has their own prices.

## Decisions

| Question | Decision |
|---|---|
| Who sets an officer's prices | The officer sets their own. Management can view, create, edit and delete any officer's policies |
| What if an officer has none | The organization-wide policies stay and become the "org default". An officer's own policy wins when one is effective on the sale date, otherwise the org default, otherwise the built-in constants |
| Existing org policies | Kept as they are. They become defaults by having no officer. No data migration |
| Which officer applies to a sale | The officer who owns the cycle's farmer when the sale metrics are calculated |
| Past sales | Unchanged. Each sale metrics row already stores the prices it used |
| Reminder | Every app launch, an officer with no policy effective today is asked to set prices. A bottom sheet with "Set prices" and "Later". "Later" hides it until the next app launch |
| Pro gating | None |

## Data

`price_policies` gains `officer_id` (nullable FK to `user`). A row with no officer is the org default.

The single unique rule `(organization_id, effective_from)` becomes two partial unique indexes, because Postgres treats NULLs as distinct:

- `(organization_id, effective_from) WHERE officer_id IS NULL`
- `(organization_id, officer_id, effective_from) WHERE officer_id IS NOT NULL`

Applied with `npm run db:push`, which will ask about replacing the old constraint.

## Price lookup

New pure function `pickPolicy(rows, officerId, date)`:

1. Among the officer's own policies with `effectiveFrom <= date`, take the latest.
2. Otherwise among org default policies with `effectiveFrom <= date`, take the latest.
3. Otherwise `null`, and the caller uses the constants.

`SaleMetricsService.getPriceForDate` takes the officer id and uses it. Its two callers (`recalculateForCycle` and the sale recording in `trpc/routers/officer/sales.ts`) pass the farmer's `officerId`.

`syncOrgPrices` (copies the latest policy onto the organization row) must only consider org default policies, otherwise one officer's prices would overwrite the organization's.

## API

- **Officer router**, new `pricePolicies`: `list` (own), `create`, `update`, `delete` (own only), and `status` returning `{ hasOwnPolicy }`, true when the officer has any policy with `effectiveFrom <= now`. Requires active membership of the org.
- **Management router**, existing `pricePolicies`:
  - `list` gets an optional `officerId` filter (`"default"` for the org default) and returns `officerId` and `officerName` on every row.
  - `create`, `update`, `delete` accept an optional `officerId`. Only management with edit access, as today.
  - Duplicate date in the same scope returns the existing "already exists" conflict message.

## Mobile

- Shared price screen content (timeline and add or edit sheet) extracted from `app/(drawer)/price-policies.tsx`, with a `scope`: own policies, or a chosen officer, or the org default.
- Management: the existing Price Policies screen gets an officer picker at the top (Org default, or a specific officer), reusing `OfficerSelector`. The add sheet creates in the picked scope.
- Officer: new "My Prices" drawer item opening the same content scoped to themselves.
- Launch prompt: a bottom sheet mounted once in `app/(drawer)/_layout.tsx` for users whose active mode is officer. It asks `status`, and if `hasOwnPolicy` is false it opens. "Set prices" goes to My Prices with the add sheet open. "Later" sets a module-level flag so it does not return until the app is relaunched.

## Sale forms

The sell form and the adjust-sale form already let the user override Rec. Price, Feed/Bag and DOC/Bird, and use the policy price when the field is empty. Three things follow from officer-wise prices:

- The sale preview (`previewSale`), saved sales and adjustments all use the farmer's officer's price through the same lookup.
- A new `sales.getPriceDefaults` call returns the effective prices for a cycle and date, and both forms show them as the field placeholders instead of the hard-coded 145, 3325 and 41.5.
- Adjust sale keeps pre-filling the sale's saved prices as values. The placeholder only shows when a field is cleared.

## Web dashboard

The price policy table gets an "Applies to" column (officer name or "Org default"). Editing officer policies from the web is out of scope.

## Testing

- `scripts/verify-price-policy-resolution.ts` for `pickPolicy`: officer policy wins, a future-dated officer policy falls back to the default, another officer's policy is ignored, no policy returns null, latest effective wins.
- Manual: officer sets prices and the next sale uses them while a colleague without prices still uses the org default; management edits an officer's policy; launch prompt appears, "Later" hides it, relaunch shows it again until a policy exists; org default screen unchanged for management.

## Risks

- Farmer reassignment: a recalculation after a farmer moves to another officer will use the new officer's prices. Stored per-sale prices stay as they were until a recalculation runs.
- An officer setting a policy dated before existing sales does not change those sales until they are recalculated.
- `db:push` on the unique constraint change should be run on a dev database first.

## Out of scope

Editing officer prices on the web, copying org policies to every officer, and blocking sales when an officer has not set prices.
