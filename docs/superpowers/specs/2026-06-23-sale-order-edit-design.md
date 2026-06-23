# Sale Order Edit — Design Spec

**Date:** 2026-06-23
**Projects:** feed-reminder-up (API), poultry-solution (mobile UI)
**Access:** Officer who created the order (same officer-only ownership model as Feed/DOC orders)

---

## Context

Feed Orders and DOC Orders both support full edit (update) after creation. Sale Orders only support create/list/delete — there is no way to fix a typo or adjust a batch after a sale order has been saved, forcing officers to delete and recreate. This adds edit parity for Sale Orders, following the exact pattern already established by Feed/DOC orders.

Sale orders are simpler than feed/doc orders: no status field, no confirm/revert lifecycle, no downstream side effects (no stock changes, no cycle creation) — editing one is a pure data update.

---

## Access Control (verified against existing routers)

- `create`: any org member may create, except a MANAGER with `accessLevel: VIEW` while in MANAGEMENT mode (explicit block).
- `update` (new): ownership check only (`officerId === ctx.user.id`) — same as Feed/DOC orders' `update`. No separate VIEW-only-manager recheck, because a VIEW-only manager can never own an order in the first place (blocked at create time), so they can never pass the ownership check either. This mirrors Feed/DOC orders' existing `update` exactly — not a new gap.
- **Scope decision:** officer-side only. `management.saleOrders` stays at `list`-only (no management-side update/delete added in this change), matching the user's explicit choice not to expand management capabilities here.

---

## Backend Changes (feed-reminder-up)

### Add `update` to `trpc/routers/officer/sale-orders.ts`

Mirrors `feed-orders.ts`'s `update` procedure exactly, adapted to sale order's simpler item shape (no `feeds[]`/`groupId` — each item is one batch):

```typescript
update: proProcedure
    .input(z.object({
        id: z.string(),
        orderDate: z.date(),
        branchName: z.string().min(1, "Branch name is required"),
        items: z.array(z.object({
            farmerId: z.string(),
            totalWeight: z.number().positive("Total weight must be greater than 0"),
            totalDoc: z.number().int().positive("DOC count must be greater than 0"),
            avgWeight: z.number().positive("Average weight is required"),
            age: z.number().int().positive("Age is required"),
        })).min(1)
    }))
    .mutation(async ({ ctx, input }) => {
        const order = await ctx.db.query.saleOrders.findFirst({
            where: and(
                eq(saleOrders.id, input.id),
                eq(saleOrders.officerId, ctx.user.id)
            )
        });

        if (!order) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Order not found or you don't have permission to edit it" });
        }

        return await ctx.db.transaction(async (tx) => {
            await tx.update(saleOrders)
                .set({ orderDate: input.orderDate, branchName: input.branchName })
                .where(eq(saleOrders.id, input.id));

            await tx.delete(saleOrderItems).where(eq(saleOrderItems.saleOrderId, input.id));

            const itemsToInsert = input.items.map(item => ({
                saleOrderId: input.id,
                farmerId: item.farmerId,
                totalWeight: item.totalWeight,
                totalDoc: item.totalDoc,
                avgWeight: item.avgWeight?.toString() || null,
                age: item.age,
            }));

            if (ctx.user.globalRole !== "ADMIN") {
                const farmers = await tx.query.farmer.findMany({
                    where: and(
                        inArray(farmer.id, input.items.map(i => i.farmerId)),
                        eq(farmer.status, "deleted")
                    )
                });
                if (farmers.length > 0) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot update order with deleted farmers: ${farmers.map(f => f.name).join(", ")}` });
                }
            }

            if (itemsToInsert.length > 0) {
                await tx.insert(saleOrderItems).values(itemsToInsert);
            }

            return { success: true };
        }),
    }),
```

No time-window restriction (unlike DOC orders' 40-day rule) — sale orders don't spawn cycles, so there's no downstream consistency risk to bound.

---

## Frontend Changes (poultry-solution)

### `components/orders/create-sale-order-modal.tsx`

Add `initialData` prop, following `create-feed-order-modal.tsx`'s exact pattern:

```typescript
initialData?: {
    id: string;
    orderDate: Date;
    branchName: string;
    items: any[]; // flat saleOrderItems rows with farmer relation
} | null;
```

- On `open` with `initialData`: populate `orderDate`, `branchName`, and group flat items by `farmerId` into `SaleItem[]` — each distinct `farmerId` becomes one `SaleItem` with one `SaleBatch` per row sharing that `farmerId` (sale order items have no `groupId`, so group purely by `farmerId`).
- Add `updateMutation = trpc.officer.saleOrders.update.useMutation(...)` alongside the existing `createMutation`.
- `handleSubmit`: branch on `initialData` — call `updateMutation.mutate({ id: initialData.id, orderDate, branchName, items: validItems })` vs the existing `createMutation.mutate({ orgId, ... })`.
- Header title: `initialData ? "Edit Sale Order" : "New Sale Order"`. Submit button text: `initialData ? "Update & Copy" : "Save & Copy"`. Success toast: `"Sale Order Updated & Copied to Clipboard!"` vs the existing create message.

### `components/orders/sale-order-card.tsx`

Add `onEdit?: () => void` prop. Render an Edit button between Copy and Delete, matching `feed-order-card.tsx`'s icon/button styling (small square icon button, `Edit2` icon from lucide-react-native).

### `app/(drawer)/(tabs)/orders.tsx`

- Add `const [editingSaleOrder, setEditingSaleOrder] = useState<any>(null);` alongside the existing sale action states.
- Wire `onEdit={() => setEditingSaleOrder(item)}` on `<SaleOrderCard />`.
- Render a second `CreateSaleOrderModal` instance conditionally, mirroring the `editingOrder`/`editingDocOrder` pattern:
  ```tsx
  {editingSaleOrder && (
      <CreateSaleOrderModal
          open={!!editingSaleOrder}
          onOpenChange={(open) => !open && setEditingSaleOrder(null)}
          orgId={membership.orgId}
          initialData={editingSaleOrder}
          onSuccess={() => saleOrdersQuery.refetch()}
      />
  )}
  ```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Order not found / not owned by caller | `NOT_FOUND` TRPC error → toast |
| Edited item references a deleted farmer | `BAD_REQUEST` with farmer names listed → toast (same as create) |
| Empty items array | Zod `.min(1)` rejects at input validation |

---

## Verification

1. As the officer who created a sale order, tap Edit on the card → modal opens pre-filled with order date, branch, and grouped farmer batches
2. Change a value (e.g. total weight) → Update & Copy → order list reflects the change
3. Add/remove a farmer or batch during edit → saves correctly (old items fully replaced)
4. As a different officer (not the creator), confirm no edit path exists (officer order lists only show their own orders, so this is naturally scoped)
5. As a VIEW-only manager in MANAGEMENT mode, confirm sale orders aren't creatable (existing behavior, unaffected) and thus never editable
