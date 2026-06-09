# Price Policies CRUD — Design Spec

**Date:** 2026-06-09
**Projects:** poultry-solution (mobile UI), feed-reminder-up (API)
**Access:** Manager / Owner in MANAGEMENT mode, or ADMIN

---

## Context

Price policies define the three pricing constants used in all profit calculations:
- `feedPricePerBag` — cost per 50kg feed bag
- `docPricePerBird` — day-old chick cost per bird
- `baseSellPrice` — base selling price per kg (floor for profit formula)

Each policy has an `effectiveFrom` date. `SaleMetricsService.getPriceForDate()` picks the most recent policy whose `effectiveFrom ≤ saleDate`. Multiple policies coexist as a history, enabling accurate recalculation of past sales.

Previously these could only be seeded or managed via direct DB/migration. This feature adds a UI for managers to manage them.

---

## Visual Design

**Style:** Follows existing app NativeWind theme. No new color system introduced — uses existing `bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground` tokens. Dark/light mode handled automatically via NativeWind class names.

**Signature element:** Vertical timeline with a pulsing green dot on the current (most recent active) policy. Historical entries are visually dimmed.

**Interaction:** Swipe left on a timeline row reveals Edit (blue) + Delete (red) action buttons.

---

## Navigation

- Entry point: drawer item "Price Policies" under Management section (same level as Members, Officers)
- Hidden from drawer for non-manager roles
- Route: `/(drawer)/price-policies`

---

## Screens & Components

### `app/(drawer)/price-policies.tsx` — Main Screen

- Header with back arrow + title "Price Policies" + `+` FAB button (top-right)
- Role guard: redirect/show empty if not OWNER/MANAGER in MANAGEMENT mode
- `FlatList` of policy entries rendered as a vertical timeline
  - **Current policy** (highest `effectiveFrom` ≤ today): green dot, green-tinted card, "CURRENT" badge, full opacity
  - **Historical policies**: grey dot, muted card, "Historical" label, 75% opacity
  - Each card: date (formatted), 3 price chips (Feed/bag, DOC/bird, Base sell)
- Swipe left on any row → reveals Edit + Delete buttons (using `react-native-gesture-handler` `Swipeable` or existing swipe pattern in codebase)
- Delete → `Alert.alert` confirmation → `delete` mutation → invalidate list
- FAB `+` → opens `PricePolicyBottomSheet` in "add" mode
- Edit → opens `PricePolicyBottomSheet` in "edit" mode with pre-filled values

### `components/management/price-policy-bottom-sheet.tsx` — Add/Edit Sheet

- Scrollable `BottomSheetModal` (same component as `register-farmer-modal`)
- Props: `open`, `onOpenChange`, `mode: "add" | "edit"`, `policy?: PricePolicy`
- Fields (react-hook-form + zod):
  - `effectiveFrom` — date picker (existing `DateTimePicker` pattern or text input formatted)
  - `feedPricePerBag` — numeric input, positive, required
  - `docPricePerBird` — numeric input, positive, required
  - `baseSellPrice` — numeric input, positive, required
- Validation: all fields required, all prices > 0
- Error: if duplicate `effectiveFrom` date → show inline toast "A policy with this date already exists"
- On success: invalidate `trpc.management.pricePolicies.list`, close sheet

---

## Data Flow

```
Screen mounts
  → trpc.management.pricePolicies.list.useQuery()
  → sorted by effectiveFrom DESC (API returns this order)
  → "current" = first item whose effectiveFrom ≤ today

Add/Edit:
  form submit → create/update mutation → invalidate list query → sheet closes

Delete:
  swipe → Alert confirm → delete mutation → invalidate list query
```

---

## Backend Changes (feed-reminder-up)

### Add `delete` procedure to `trpc/routers/management/price-policies.ts`

```typescript
delete: managementProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const orgId = ctx.membership.organizationId;
    const existing = await ctx.db.query.pricePolicies.findFirst({
      where: and(eq(pricePolicies.id, input.id), eq(pricePolicies.organizationId, orgId))
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.delete(pricePolicies).where(eq(pricePolicies.id, input.id));
  })
```

Guard: `managementProcedure` + verify resource belongs to caller's org (no cross-org deletes).

### Fix TypeScript error in `trpc/routers/officer/sales.ts:1177`

```typescript
// input.saleDate is Date | undefined — provide fallback
const policyPrices = await SaleMetricsService.getPriceForDate(orgId, input.saleDate ?? new Date());
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Duplicate `effectiveFrom` date | Unique constraint throws → catch in `onError`, toast "A policy with this date already exists" |
| Delete current policy | Allow — backend has no restriction, UI shows confirmation "This is the current active policy. Are you sure?" |
| Network error | Toast error via `sonner-native` |
| Not in MANAGEMENT mode | Screen shows access-denied state or redirects |

---

## Verification

1. Open app as manager in MANAGEMENT mode → drawer shows "Price Policies"
2. Navigate to screen → timeline shows existing policies, current highlighted
3. Tap `+` → sheet opens, fill all fields, save → new entry appears on timeline
4. Tap `+` again with same date → error toast appears, no duplicate created
5. Swipe left on a row → Edit + Delete revealed
6. Edit → sheet pre-filled → update → timeline reflects change
7. Delete → confirmation alert → confirm → entry removed
8. Dark mode: all colors correct, no hardcoded light-only values
9. Preview sale in sell-modal: no TypeScript error, feed cost shows correct price from policy
