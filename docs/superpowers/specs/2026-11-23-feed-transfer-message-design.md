# Feed Transfer Message - Design

**Date:** 2026-11-23
**Status:** Approved by user, implemented without a separate plan document (small, two-repo change)
**Scope:** `poultry-solution` (formatter, transfer modal, ledger screens, one new button component) and `feed-reminder-up` (one read-only lookup on the officer and management stock routers).

## Goal

After a successful feed transfer, copy a ready-to-paste message to the clipboard automatically. Transfer rows in the stock ledgers get a Copy button that rebuilds the same message later.

## Message format

```
Date: 22 Nov 2026
Feed Transfer

From: Rahim Poultry Farm
To: Karim Agro Farm

Quantity:
- 5 bags (B1)
- 1 bag (B2)
Total: 6 bags
```

- "bag" for exactly 1, otherwise "bags". Decimals are kept (`2.5 bags`).
- A line with no feed type has no brackets.
- Date is the transfer's date in `dd MMM yyyy`.
- One formatter, `lib/feed-transfer.ts`, produces it everywhere.

## Behavior

| Where | What |
|---|---|
| Transfer modal, on success | Builds the message from what the modal already has (source farm name, selected target name, the submitted lines, today) and copies it. Toast: "Stock transferred and message copied". If the clipboard write fails the plain success toast is shown, the transfer is unaffected |
| Stock Ledger screen (drawer) | Small Copy chip on the first row of each transfer in a farmer's recent logs |
| Farmer ledger screen | Copy icon on every transfer row |
| Reverted transfers | No Copy button |

A transfer writes one `TRANSFER_OUT` row per feed type on the source farmer and one `TRANSFER_IN` row per feed line on the target, all with the same `referenceId`. The ledger button asks the backend to rebuild the message from those rows.

## Backend

- `stock.getTransferSummary({ referenceId })` on both the officer and management stock routers, backed by `modules/stock/server/transfer-summary-service.ts`.
- Returns `{ referenceId, date, fromFarmer, toFarmer, lines: [{ feedType, quantity }], reverted }`.
- Quantities come from the `TRANSFER_IN` rows (written exactly as sent). The debit side can be split across types (named type plus an Unspecified fallback), so it is only used if no credit rows exist.
- `reverted` is true when an `ADJUSTMENT` row points at any of the transfer's rows (how `revertTransfer` records a revert).
- Access: an officer must own one of the two farmers, management must belong to the org of one of them, admins always pass. Otherwise `FORBIDDEN`.
- No schema change and no `db:push`.

## Testing

`scripts/verify-feed-transfer.ts` (`tsx` + `node:assert`) covers singular and plural bags, missing feed types, decimal totals and the exact message text. Manual checks: transfer with one and several feed types from officer and management mode, paste the result, copy from both ledgers, and confirm a reverted transfer has no button.

## Out of scope

Sharing the message through the system share sheet, and including the transfer note in the message.
