# Sale Order Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit support to Sale Orders, matching the existing Feed/DOC order edit pattern.

**Architecture:** Add an `update` tRPC mutation to `officer.saleOrders` (ownership-checked, transaction-based delete+reinsert of items, mirroring `feed-orders.ts`'s `update`). Extend the existing `CreateSaleOrderModal` with an `initialData` prop to handle both create and edit. Wire an Edit button on `SaleOrderCard` and edit state in `orders.tsx`.

**Tech Stack:** tRPC + Drizzle (feed-reminder-up), React Native + Expo Router + react-hook-form-free local state (poultry-solution)

**Spec:** `docs/superpowers/specs/2026-06-23-sale-order-edit-design.md`

---

### Task 1: Add `update` mutation to officer sale-orders router

**Files:**
- Modify: `C:/Users/amiba/Projects/feed-reminder-up/trpc/routers/officer/sale-orders.ts`

- [ ] **Step 1: Add the `update` procedure**

Insert after the `delete` procedure (before the closing `});` of `saleOrdersRouter`):

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
                    .set({
                        orderDate: input.orderDate,
                        branchName: input.branchName,
                    })
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
            });
        }),
```

No new imports needed — `TRPCError`, `and`, `eq`, `inArray`, `farmer`, `saleOrderItems`, `saleOrders` are already imported at the top of this file.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:/Users/amiba/Projects/feed-reminder-up && npx tsc --noEmit`
Expected: no new errors referencing `sale-orders.ts`

---

### Task 2: Add edit mode to `CreateSaleOrderModal`

**Files:**
- Modify: `C:/Users/amiba/Projects/poultry-solution/components/orders/create-sale-order-modal.tsx`

- [ ] **Step 1: Add `initialData` prop to the interface**

Replace:
```typescript
interface CreateSaleOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}
```
With:
```typescript
interface CreateSaleOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
    initialData?: {
        id: string;
        orderDate: Date | string;
        branchName: string;
        items: any[]; // flat saleOrderItems rows with farmer relation
    } | null;
}
```

- [ ] **Step 2: Accept `initialData` in the component signature**

Replace:
```typescript
export function CreateSaleOrderModal({ open, onOpenChange, orgId, onSuccess }: CreateSaleOrderModalProps) {
```
With:
```typescript
export function CreateSaleOrderModal({ open, onOpenChange, orgId, onSuccess, initialData }: CreateSaleOrderModalProps) {
```

- [ ] **Step 3: Populate form state from `initialData` on open**

Replace the existing reset effect:
```typescript
    useEffect(() => {
        if (open) {
            setOrderDate(new Date());
            setBranchName(sessionData?.user?.branchName || "");
            setItems([]);
        }
    }, [open, sessionData?.user?.branchName]);
```
With:
```typescript
    useEffect(() => {
        if (open) {
            if (initialData) {
                setOrderDate(new Date(initialData.orderDate));
                setBranchName(initialData.branchName || "");

                // Group flat items from DB by farmerId
                const grouped: Record<string, SaleItem> = {};
                (initialData.items as any[]).forEach(item => {
                    const key = item.farmerId;
                    if (!grouped[key]) {
                        grouped[key] = {
                            id: key,
                            farmerId: item.farmerId,
                            farmerName: item.farmer?.name || "Unknown",
                            location: item.farmer?.location,
                            mobile: item.farmer?.mobile,
                            batches: []
                        };
                    }
                    grouped[key].batches.push({
                        id: generateId(),
                        totalWeight: item.totalWeight?.toString() ?? "",
                        totalDoc: item.totalDoc?.toString() ?? "",
                        avgWeight: item.avgWeight?.toString() ?? "",
                        age: item.age?.toString() ?? "",
                    });
                });
                setItems(Object.values(grouped));
            } else {
                setOrderDate(new Date());
                setBranchName(sessionData?.user?.branchName || "");
                setItems([]);
            }
        }
    }, [open, initialData, sessionData?.user?.branchName]);
```

- [ ] **Step 4: Add the update mutation**

Insert after the existing `createMutation` block:
```typescript
    const updateMutation = trpc.officer.saleOrders.update.useMutation({
        onSuccess: () => {
            const text = generateCopyText();
            Clipboard.setStringAsync(text);
            toast.success("Sale Order Updated & Copied to Clipboard!");
            setItems([]);
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });
```

- [ ] **Step 5: Combine pending state**

Replace:
```typescript
    const isSubmitting = createMutation.isPending;
```
With:
```typescript
    const isSubmitting = createMutation.isPending || updateMutation.isPending;
```

- [ ] **Step 6: Branch `handleSubmit` on `initialData`**

Replace the final part of `handleSubmit`:
```typescript
        createMutation.mutate({
            orgId,
            orderDate,
            branchName: branchName.trim(),
            items: validItems
        });
    };
```
With:
```typescript
        if (initialData) {
            updateMutation.mutate({
                id: initialData.id,
                orderDate,
                branchName: branchName.trim(),
                items: validItems
            });
        } else {
            createMutation.mutate({
                orgId,
                orderDate,
                branchName: branchName.trim(),
                items: validItems
            });
        }
    };
```

- [ ] **Step 7: Update header title and submit button text**

Replace:
```typescript
                        <Text className="text-lg font-bold text-foreground">New Sale Order</Text>
```
With:
```typescript
                        <Text className="text-lg font-bold text-foreground">{initialData ? "Edit Sale Order" : "New Sale Order"}</Text>
```

Replace the submit button label:
```typescript
                        {isSubmitting ? (
                            <Text>Saving...</Text>
                        ) : (
                            <>
                                <Icon as={Copy} size={18} className="mr-2 text-primary-foreground" />
                                <Text>Save & Copy</Text>
                            </>
                        )}
```
With:
```typescript
                        {isSubmitting ? (
                            <Text>Saving...</Text>
                        ) : (
                            <>
                                <Icon as={Copy} size={18} className="mr-2 text-primary-foreground" />
                                <Text>{initialData ? "Update & Copy" : "Save & Copy"}</Text>
                            </>
                        )}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd C:/Users/amiba/Projects/poultry-solution && npx tsc --noEmit`
Expected: no new errors referencing `create-sale-order-modal.tsx`

---

### Task 3: Add Edit button to `SaleOrderCard`

**Files:**
- Modify: `C:/Users/amiba/Projects/poultry-solution/components/orders/sale-order-card.tsx`

- [ ] **Step 1: Add `Edit2` to the lucide import**

Replace:
```typescript
import { Calendar, ChevronDown, ChevronUp, Copy, ShoppingBag, Trash2 } from "lucide-react-native";
```
With:
```typescript
import { Calendar, ChevronDown, ChevronUp, Copy, Edit2, ShoppingBag, Trash2 } from "lucide-react-native";
```

- [ ] **Step 2: Add `onEdit` prop**

Replace:
```typescript
export function SaleOrderCard({
    order,
    onPress,
    onDelete,
    showOfficerName = false,
}: {
    order: any,
    onPress?: () => void,
    onDelete?: () => void,
    showOfficerName?: boolean,
}) {
```
With:
```typescript
export function SaleOrderCard({
    order,
    onPress,
    onDelete,
    onEdit,
    showOfficerName = false,
}: {
    order: any,
    onPress?: () => void,
    onDelete?: () => void,
    onEdit?: () => void,
    showOfficerName?: boolean,
}) {
```

- [ ] **Step 3: Render the Edit button between Copy and Delete**

Replace:
```typescript
                        <View className="flex-row items-center gap-2">
                            <Pressable
                                onPress={handleCopy}
                                className="w-8 h-8 rounded-lg bg-primary items-center justify-center active:bg-primary/80"
                            >
                                <Icon as={Copy} size={14} className="text-primary-foreground" />
                            </Pressable>
                            <Pressable
                                onPress={onDelete}
                                className="w-8 h-8 rounded-lg bg-destructive items-center justify-center active:bg-destructive/80"
                            >
                                <Icon as={Trash2} size={14} className="text-destructive-foreground" />
                            </Pressable>

                        </View>
```
With:
```typescript
                        <View className="flex-row items-center gap-2">
                            <Pressable
                                onPress={handleCopy}
                                className="w-8 h-8 rounded-lg bg-primary items-center justify-center active:bg-primary/80"
                            >
                                <Icon as={Copy} size={14} className="text-primary-foreground" />
                            </Pressable>
                            {onEdit && (
                                <Pressable
                                    onPress={onEdit}
                                    className="w-8 h-8 rounded-lg bg-blue-500 items-center justify-center active:bg-blue-500/80"
                                >
                                    <Icon as={Edit2} size={14} className="text-white" />
                                </Pressable>
                            )}
                            <Pressable
                                onPress={onDelete}
                                className="w-8 h-8 rounded-lg bg-destructive items-center justify-center active:bg-destructive/80"
                            >
                                <Icon as={Trash2} size={14} className="text-destructive-foreground" />
                            </Pressable>

                        </View>
```

---

### Task 4: Wire edit state into the Orders screen

**Files:**
- Modify: `C:/Users/amiba/Projects/poultry-solution/app/(drawer)/(tabs)/orders.tsx`

- [ ] **Step 1: Add edit state**

Replace:
```typescript
    // Sale Action States
    const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);
    const [deletingSaleOrderId, setDeletingSaleOrderId] = useState<string | null>(null);
```
With:
```typescript
    // Sale Action States
    const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);
    const [editingSaleOrder, setEditingSaleOrder] = useState<any>(null);
    const [deletingSaleOrderId, setDeletingSaleOrderId] = useState<string | null>(null);
```

- [ ] **Step 2: Wire `onEdit` on the card**

Replace:
```typescript
                                    <SaleOrderCard
                                        order={item}
                                        onPress={() => { /* Handle press if needed */ }}
                                        onDelete={() => setDeletingSaleOrderId(item.id)}
                                        showOfficerName={isManagement}
                                    />
```
With:
```typescript
                                    <SaleOrderCard
                                        order={item}
                                        onPress={() => { /* Handle press if needed */ }}
                                        onDelete={() => setDeletingSaleOrderId(item.id)}
                                        onEdit={() => setEditingSaleOrder(item)}
                                        showOfficerName={isManagement}
                                    />
```

- [ ] **Step 3: Render the edit modal instance**

Replace:
```typescript
                    {/* Sale Order Modal */}
                    <CreateSaleOrderModal
                        open={isCreateSaleOpen}
                        onOpenChange={setIsCreateSaleOpen}
                        orgId={membership.orgId}
                        onSuccess={() => saleOrdersQuery.refetch()}
                    />

                    {deletingSaleOrderId && (
```
With:
```typescript
                    {/* Sale Order Modal */}
                    <CreateSaleOrderModal
                        open={isCreateSaleOpen}
                        onOpenChange={setIsCreateSaleOpen}
                        orgId={membership.orgId}
                        onSuccess={() => saleOrdersQuery.refetch()}
                    />

                    {editingSaleOrder && (
                        <CreateSaleOrderModal
                            open={!!editingSaleOrder}
                            onOpenChange={(open) => !open && setEditingSaleOrder(null)}
                            orgId={membership.orgId}
                            initialData={editingSaleOrder}
                            onSuccess={() => saleOrdersQuery.refetch()}
                        />
                    )}

                    {deletingSaleOrderId && (
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd C:/Users/amiba/Projects/poultry-solution && npx tsc --noEmit`
Expected: no new errors referencing `orders.tsx`, `sale-order-card.tsx`, or `create-sale-order-modal.tsx`

---

### Task 5: Update CHANGELOG

**Files:**
- Modify: `C:/Users/amiba/Projects/poultry-solution/CHANGELOG.md`

- [ ] **Step 1: Add an entry under `[Unreleased]` → `### Added`**

Add to the existing `### Added` list under `[Unreleased]`:
```markdown
- Sale Orders can now be edited after creation (officer who created it), matching Feed/DOC order edit support
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers backend `update` (access control section). Task 2 covers the create-modal edit mode (frontend section). Tasks 3–4 cover card + screen wiring (frontend section). Task 5 covers the CHANGELOG ask. All spec sections have a corresponding task.
- **Placeholder scan:** none — all steps show full code.
- **Type consistency:** `SaleItem`/`SaleBatch` field names (`farmerId`, `farmerName`, `location`, `mobile`, `batches`, `totalWeight`, `totalDoc`, `avgWeight`, `age`) match the existing interfaces already defined in `create-sale-order-modal.tsx`; `generateId()` is the existing helper in that file, reused as-is.
