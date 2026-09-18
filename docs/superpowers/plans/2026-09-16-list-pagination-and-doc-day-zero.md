# List Pagination + DOC Day-0 Cycles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every farmer reachable in both farmer pickers, make the whole sales history reachable, and make DOC-order cycles read day 0 on the day the chicks arrive.

**Architecture:** Farmer pickers move to page-number cursor pagination behind one shared mobile component. Sales history moves to keyset pagination (`saleDate DESC, id DESC`) with search pushed into SQL, hydrating each page's rows by id. DOC-order cycles are inserted dated one day after placement with the real placement date stored in `officialInputDate`, and the age floor in the feed service drops to 0 — no age convention change anywhere else.

**Tech Stack:** tRPC v11 + Drizzle ORM + Postgres (Neon) on the API (`../feed-reminder-up`, Next.js), React Native + Expo Router + TanStack Query on mobile (`.`, this repo).

**Spec:** `docs/superpowers/specs/2026-09-16-list-pagination-and-doc-day-zero-design.md`

---

## Repo layout note

Two repos, both checked out side by side:

- Mobile: `c:\Users\amiba\Projects\poultry-solution` (this repo)
- API: `c:\Users\amiba\Projects\feed-reminder-up`

The mobile app imports `AppRouter` types straight from `../feed-reminder-up`, so an API change is visible to the mobile type-checker immediately. **Do API tasks before the mobile task that consumes them.** Commit in each repo separately.

## Testing note — read before Task 1

Neither repo has a test runner (no jest/vitest, no `test` script). Do **not** add one as part of this work. Verification per task is:

1. `npx tsc --noEmit` in the repo you changed — must be clean of new errors.
2. For the two paginated API procedures, a throwaway node script that pages through real data and asserts no duplicates and no gaps (given in full in Task 5).
3. The manual device checks listed in Task 11.

Run `npx tsc --noEmit` once in each repo **before starting** and keep the output. Both repos have pre-existing type noise in unrelated files; "clean" means no *new* errors in files you touched.

---

## File Structure

**API (`../feed-reminder-up`):**

| File | Responsibility | Change |
|---|---|---|
| `trpc/routers/officer/farmers.ts` | farmer list for pickers | add `cursor` input + `nextCursor` output |
| `trpc/routers/officer/sales.ts` | officer sales list + shared context helper | keyset paging, SQL search, helper cleanup |
| `trpc/routers/management/sales.ts` | management sales list | keyset paging, SQL org filter |
| `trpc/routers/officer/doc-orders.ts` | DOC order confirm → cycle creation | date shift + `officialInputDate` |
| `modules/cycles/server/services/feed-service.ts` | sole writer of `cycles.age` | age floor 1 → 0 |
| `trpc/routers/officer/cycles.ts` | mortality logging | date guards use `officialInputDate ?? createdAt` |

**Mobile (this repo):**

| File | Responsibility | Change |
|---|---|---|
| `components/farmers/farmer-picker-list.tsx` | **new** — searchable, infinite farmer list | create |
| `components/orders/create-feed-order-modal.tsx` | feed order creation | use the shared picker |
| `components/cycles/cycle-modal.tsx` | cycle creation | use the shared picker (gains search) |
| `app/(drawer)/(tabs)/sales.tsx` | sales history screen | infinite query + `onEndReached` |

---

## Task 1: Cursor support on `listWithStock` (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/officer/farmers.ts:54-64` (input + destructure) and `:145-147` (return)

- [ ] **Step 1: Add `cursor` to the input schema**

In `listWithStock`, replace the input object:

```typescript
    listWithStock: protectedProcedure
        .input(z.object({
            orgId: z.string(),
            search: z.string().optional(),
            page: z.number().default(1),
            // Page number used by useInfiniteQuery. Falls back to `page` for existing callers.
            cursor: z.number().nullish(),
            pageSize: z.number().default(10),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        }))
```

- [ ] **Step 2: Resolve the effective page**

Replace the destructure line at the top of the query body:

```typescript
        .query(async ({ ctx, input }) => {
            const { orgId, search, pageSize } = input;
            const page = input.cursor ?? input.page;
```

Everything below it already uses `page` and `pageSize`, so no other body change is needed.

- [ ] **Step 3: Return `nextCursor`**

At the end of the same procedure, extend the returned object (keep `items`, `total`, `totalPages` exactly as they are):

```typescript
                total: Number(total.count),
                totalPages: Math.ceil(Number(total.count) / pageSize),
                nextCursor: page * pageSize < Number(total.count) ? page + 1 : null
            };
```

- [ ] **Step 4: Type-check**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && npx tsc --noEmit`
Expected: no new errors. Existing callers pass `page` and never read `nextCursor`, so they are unaffected.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\amiba\Projects\feed-reminder-up
git add trpc/routers/officer/farmers.ts
git commit -m "feat(farmers): add cursor pagination to listWithStock"
```

---

## Task 2: Shared `FarmerPickerList` component (mobile)

**Files:**
- Create: `components/farmers/farmer-picker-list.tsx`

- [ ] **Step 1: Create the component**

Write this file exactly:

```tsx
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react-native";
import { ReactElement, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

export type PickerFarmer = {
    id: string;
    name: string;
    location?: string | null;
    mainStock: number;
    [key: string]: any;
};

interface FarmerPickerListProps {
    orgId: string;
    /** Skip the query until the picker is actually visible. */
    enabled?: boolean;
    placeholder?: string;
    pageSize?: number;
    /** Caller owns the row: selection state, layout, press handling. */
    renderRow: (farmer: PickerFarmer) => ReactElement;
}

export const FarmerPickerList = ({
    orgId,
    enabled = true,
    placeholder = "Search farmers...",
    pageSize = 20,
    renderRow,
}: FarmerPickerListProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = trpc.officer.farmers.listWithStock.useInfiniteQuery(
        { orgId, pageSize, search: debouncedSearch.trim() || undefined },
        {
            enabled: enabled && !!orgId,
            getNextPageParam: (lastPage: any) => lastPage.nextCursor,
        }
    );

    const farmers: PickerFarmer[] = data?.pages.flatMap((p: any) => p.items) ?? [];
    const isSearching = debouncedSearch.trim().length > 0;

    return (
        <View className="flex-1">
            <View className="px-4 py-3 border-b border-border/50">
                <View className="relative justify-center">
                    <View className="absolute left-3 z-10 w-5 h-5 justify-center items-center">
                        <Icon as={Search} size={18} className="text-muted-foreground" />
                    </View>
                    <Input
                        placeholder={placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="pl-10 h-10"
                    />
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={36} />
                    <Text className="mt-4 text-muted-foreground font-black uppercase tracking-tight text-xs">
                        Loading farmers...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={farmers}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => renderRow(item)}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text className="text-muted-foreground">
                                {isSearching ? "No farmer matches that search." : "No farmers found."}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
```

- [ ] **Step 2: Type-check**

Run: `cd c:\Users\amiba\Projects\poultry-solution && npx tsc --noEmit`
Expected: no errors in `components/farmers/farmer-picker-list.tsx`. If `useInfiniteQuery` complains that the input has no cursor, Task 1 was not completed or the API repo was not saved.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\amiba\Projects\poultry-solution
git add components/farmers/farmer-picker-list.tsx
git commit -m "feat(farmers): add shared infinite farmer picker list"
```

---

## Task 3: Feed order modal uses the shared picker (mobile)

**Files:**
- Modify: `components/orders/create-feed-order-modal.tsx:87-98` (state + query) and `:305-362` (search screen)

- [ ] **Step 1: Delete the local search query**

Remove these lines (the `searchQuery` state stays out — the picker owns it now; `isSearchOpen` stays):

```tsx
    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const { data: searchResults, isFetching: isSearching } = trpc.officer.farmers.listWithStock.useQuery(
        {
            orgId,
            page: 1,
            pageSize: 20,
            search: searchQuery
        },
        { enabled: isSearchOpen }
    );
```

and replace with:

```tsx
    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
```

- [ ] **Step 2: Replace the search screen body**

Replace the whole `if (isSearchOpen) { ... }` block with:

```tsx
    if (isSearchOpen) {
        return (
            <BottomSheetModal open={open} onOpenChange={() => setIsSearchOpen(false)} fullScreen>
                <View className="flex-1 bg-background">
                    <View className="px-4 py-4 border-b border-border/50 flex-row gap-2 items-center">
                        <Text className="flex-1 text-lg font-bold text-foreground">Add Farmers</Text>
                        <Pressable onPress={() => setIsSearchOpen(false)}>
                            <Text className="text-primary font-bold">Done</Text>
                        </Pressable>
                    </View>

                    <FarmerPickerList
                        orgId={orgId}
                        enabled={isSearchOpen}
                        placeholder="Search inventory to add..."
                        renderRow={(item) => {
                            const isSelected = items.some(i => i.farmerId === item.id);
                            return (
                                <Pressable
                                    onPress={() => handleToggleFarmer(item as any)}
                                    className="p-4 border-b border-border/50 flex-row justify-between items-center active:bg-accent"
                                >
                                    <View>
                                        <Text className="font-bold text-base">{item.name}</Text>
                                        {item.location && <Text className="text-xs text-muted-foreground">{item.location}</Text>}
                                    </View>
                                    <View className={`w-6 h-6 rounded-full border ${isSelected ? 'bg-primary border-primary items-center justify-center' : 'border-muted-foreground'}`}>
                                        {isSelected && <Icon as={CheckCircle2} size={16} className="text-white" />}
                                    </View>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            </BottomSheetModal>
        );
    }
```

- [ ] **Step 3: Fix imports**

Add to the import block at the top:

```tsx
import { FarmerPickerList } from "@/components/farmers/farmer-picker-list";
```

Then remove any import that is now unused. `FlatList` and `Search` are very likely unused in this file after the change — check with:

Run: `cd c:\Users\amiba\Projects\poultry-solution && grep -n "FlatList\|Search\b\|BirdyLoader" components/orders/create-feed-order-modal.tsx`
If a symbol only appears on its import line, delete it from the import.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in this file.

- [ ] **Step 5: Commit**

```bash
git add components/orders/create-feed-order-modal.tsx
git commit -m "feat(orders): paginate farmer search in feed order modal"
```

---

## Task 4: Cycle create modal uses the shared picker (mobile)

**Files:**
- Modify: `components/cycles/cycle-modal.tsx:54-59` (query) and `:268-308` (picker sheet)

- [ ] **Step 1: Delete the fixed 100-row query**

Remove:

```tsx
    const { data: farmersData, isLoading: isLoadingFarmers } = trpc.officer.farmers.listWithStock.useQuery(
        { orgId, pageSize: 100 },
        { enabled: open && !!orgId && !initialFarmer }
    );
    const farmers = farmersData?.items || [];
```

- [ ] **Step 2: Replace the picker sheet content**

Inside the farmer `BottomSheetModal`, replace the `<View className="p-4" ...>` wrapper and its `FlatList` with:

```tsx
                                    <View className="flex-1" style={{ maxHeight: '100%' }}>
                                        <View className="flex-row justify-between items-center p-4 border-b border-border/50">
                                            <Text className="text-xl font-bold">Select Farmer</Text>
                                            <Button variant="ghost" size="icon" onPress={() => setIsFarmerOpen(false)}>
                                                <Icon as={X} size={20} className="text-muted-foreground" />
                                            </Button>
                                        </View>
                                        <FarmerPickerList
                                            orgId={orgId}
                                            enabled={isFarmerOpen}
                                            placeholder="Search farmers..."
                                            renderRow={(f) => (
                                                <Pressable
                                                    onPress={() => {
                                                        setFarmerId(f.id);
                                                        setFarmerName(f.name);
                                                        setIsFarmerOpen(false);
                                                    }}
                                                    className={`p-4 border-b border-border/20 active:bg-muted/30 ${farmerId === f.id ? 'bg-primary/5' : ''}`}
                                                >
                                                    <View className="flex-row items-center justify-between">
                                                        <View>
                                                            <Text className={`font-medium ${farmerId === f.id ? 'text-primary' : 'text-foreground'}`}>
                                                                {f.name}
                                                            </Text>
                                                            <Text className="text-xs text-muted-foreground">Stock: {Number(f.mainStock).toFixed(1)}</Text>
                                                        </View>
                                                        {farmerId === f.id && (
                                                            <Icon as={Check} size={16} className="text-primary" />
                                                        )}
                                                    </View>
                                                </Pressable>
                                            )}
                                        />
                                    </View>
```

- [ ] **Step 3: Fix imports and leftover references**

Add:

```tsx
import { FarmerPickerList } from "@/components/farmers/farmer-picker-list";
```

Run: `cd c:\Users\amiba\Projects\poultry-solution && grep -n "isLoadingFarmers\|farmers\b\|FlatList" components/cycles/cycle-modal.tsx`
Expected: no remaining uses of `isLoadingFarmers` or the deleted `farmers` array. Remove `FlatList` from the react-native import if it is no longer used anywhere in the file.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in this file.

- [ ] **Step 5: Commit**

```bash
git add components/cycles/cycle-modal.tsx
git commit -m "feat(cycles): add searchable paginated farmer picker to cycle create"
```

---

## Task 5: Keyset pagination for officer sales (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/officer/sales.ts:2188-2243` (`getRecentSales`)
- Create (throwaway, deleted in Step 5): `../feed-reminder-up/page-check.mjs`

- [ ] **Step 1: Add the `ilike` import**

At the top of `trpc/routers/officer/sales.ts`, the drizzle import currently reads:

```typescript
import { and, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
```

Change it to:

```typescript
import { and, desc, eq, ilike, inArray, like, ne, or, sql } from "drizzle-orm";
```

Also make sure `cycles`, `cycleHistory` and `farmer` are in the schema import on line 2 — they already are.

- [ ] **Step 2: Replace the whole `getRecentSales` procedure**

Replace from `getRecentSales: proProcedure` through the closing `}),` of that procedure with:

```typescript
    getRecentSales: proProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            // Keyset cursor: the (saleDate, id) of the last row of the previous page.
            cursor: z.object({ saleDate: z.date(), id: z.string() }).nullish(),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const search = input.search?.trim();

            const conditions: any[] = [
                eq(saleEvents.createdBy, ctx.user.id),
                ne(farmer.status, "deleted"),
            ];

            if (input.cursor) {
                conditions.push(
                    sql`(${saleEvents.saleDate}, ${saleEvents.id}) < (${input.cursor.saleDate}, ${input.cursor.id})`
                );
            }

            if (search) {
                const pattern = `%${search}%`;
                conditions.push(
                    or(
                        ilike(farmer.name, pattern),
                        ilike(saleEvents.party, pattern),
                        ilike(saleEvents.location, pattern)
                    )!
                );
            }

            // Step 1: pick the page's ids in SQL (filters + cursor + order live here).
            // Fetch one extra row to learn whether another page exists.
            const pageRows = await ctx.db
                .select({ id: saleEvents.id, saleDate: saleEvents.saleDate })
                .from(saleEvents)
                .leftJoin(cycles, eq(saleEvents.cycleId, cycles.id))
                .leftJoin(cycleHistory, eq(saleEvents.historyId, cycleHistory.id))
                .innerJoin(
                    farmer,
                    or(eq(farmer.id, cycles.farmerId), eq(farmer.id, cycleHistory.farmerId))!
                )
                .where(and(...conditions))
                .orderBy(desc(saleEvents.saleDate), desc(saleEvents.id))
                .limit(input.limit + 1);

            const hasMore = pageRows.length > input.limit;
            const pageSlice = pageRows.slice(0, input.limit);

            if (pageSlice.length === 0) {
                return { items: [], nextCursor: null };
            }

            const pageIds = pageSlice.map(r => r.id);

            // Step 2: hydrate the page with its relations.
            const events = await ctx.db.query.saleEvents.findMany({
                where: inArray(saleEvents.id, pageIds),
                orderBy: [desc(saleEvents.saleDate), desc(saleEvents.id)],
                with: {
                    cycle: { with: { farmer: true } },
                    history: { with: { farmer: true } },
                    reports: {
                        with: { createdByUser: { columns: { name: true } } },
                        orderBy: desc(saleReports.createdAt),
                        columns: {
                            id: true,
                            birdsSold: true,
                            birdsRejected: true,
                            totalWeight: true,
                            pricePerKg: true,
                            totalAmount: true,
                            avgWeight: true,
                            totalMortality: true,
                            cashReceived: true,
                            depositReceived: true,
                            medicineCost: true,
                            adjustmentNote: true,
                            party: true,
                            feedConsumed: true,
                            feedStock: true,
                            feedPriceUsed: true,
                            docPriceUsed: true,
                            recoveryPrice: true,
                            age: true,
                            createdAt: true,
                            officialInputDate: true,
                            saleDate: true,
                        }
                    }
                }
            });

            const items = await appendCycleContextToSales(ctx, events);
            const last = pageSlice[pageSlice.length - 1];

            return {
                items,
                nextCursor: hasMore ? { saleDate: last.saleDate, id: last.id } : null,
            };
        }),
```

Note: the relation/column list above is copied verbatim from the procedure being replaced — do not trim it, the mobile UI reads every one of those fields.

- [ ] **Step 3: Type-check**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && npx tsc --noEmit`
Expected: no new errors in `trpc/routers/officer/sales.ts`. The mobile repo will report errors on `sales.tsx` until Task 8 — that is expected and is a different repo.

- [ ] **Step 4: Verify paging against real data**

Create `../feed-reminder-up/page-check.mjs`:

```javascript
import { Pool } from "@neondatabase/serverless";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const url = env.split(/\r?\n/).find(l => l.startsWith("DATABASE_URL="))
    .slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
const pool = new Pool({ connectionString: url });

// Mirrors the SQL the procedure builds: newest first, keyset on (sale_date, id).
const OFFICER = process.argv[2]; // pass a created_by user id
const LIMIT = 7;

const page = async (cursor) => {
    const params = [OFFICER];
    let where = `se.created_by = $1 AND f.status <> 'deleted'`;
    if (cursor) {
        params.push(cursor.saleDate, cursor.id);
        where += ` AND (se.sale_date, se.id) < ($2, $3)`;
    }
    const { rows } = await pool.query(`
        SELECT se.id, se.sale_date
        FROM sale_events se
        LEFT JOIN cycles c ON se.cycle_id = c.id
        LEFT JOIN cycle_history h ON se.history_id = h.id
        JOIN farmer f ON f.id = c.farmer_id OR f.id = h.farmer_id
        WHERE ${where}
        ORDER BY se.sale_date DESC, se.id DESC
        LIMIT ${LIMIT}`, params);
    return rows;
};

const all = [];
let cursor = null;
for (let i = 0; i < 100; i++) {
    const rows = await page(cursor);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < LIMIT) break;
    const last = rows[rows.length - 1];
    cursor = { saleDate: last.sale_date, id: last.id };
}

const { rows: oneShot } = await pool.query(`
    SELECT se.id
    FROM sale_events se
    LEFT JOIN cycles c ON se.cycle_id = c.id
    LEFT JOIN cycle_history h ON se.history_id = h.id
    JOIN farmer f ON f.id = c.farmer_id OR f.id = h.farmer_id
    WHERE se.created_by = $1 AND f.status <> 'deleted'
    ORDER BY se.sale_date DESC, se.id DESC`, [OFFICER]);

const paged = all.map(r => r.id);
const direct = oneShot.map(r => r.id);
console.log("paged rows:", paged.length, "| direct rows:", direct.length);
console.log("duplicates:", paged.length - new Set(paged).size);
console.log("same order & contents:", JSON.stringify(paged) === JSON.stringify(direct));
await pool.end();
```

Get an officer id to test with:

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && node -e "import('@neondatabase/serverless').then(async({Pool})=>{const fs=await import('fs');const u=fs.readFileSync('.env','utf8').split(/\r?\n/).find(l=>l.startsWith('DATABASE_URL=')).slice(13).replace(/^[\"']|[\"']$/g,'');const p=new Pool({connectionString:u});const r=await p.query('SELECT created_by, COUNT(*) FROM sale_events GROUP BY 1 ORDER BY 2 DESC LIMIT 3');console.table(r.rows);await p.end();})"`

Then run the check with the busiest officer id:

Run: `node page-check.mjs <officer-id>`
Expected output:
```
paged rows: N | direct rows: N
duplicates: 0
same order & contents: true
```
If `same order & contents` is false, the cursor predicate or the ORDER BY is wrong — fix before continuing.

- [ ] **Step 5: Delete the script and commit**

```bash
cd c:\Users\amiba\Projects\feed-reminder-up
rm page-check.mjs
git add trpc/routers/officer/sales.ts
git commit -m "feat(sales): keyset pagination and SQL search for officer sales list"
```

---

## Task 6: Keyset pagination for management sales (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/management/sales.ts` (whole `getRecentSales`)

- [ ] **Step 1: Replace the file**

The management variant needs the same paging plus an org filter in SQL — the current post-fetch org filter would make pages arbitrarily short. Replace the file with:

```typescript
import { cycleHistory, cycles, farmer, saleEvents, saleReports } from "@/db/schema";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, managementProProcedure } from "../../init";
import { appendCycleContextToSales } from "../officer/sales";

export const managementSalesRouter = createTRPCRouter({
    getRecentSales: managementProProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            cursor: z.object({ saleDate: z.date(), id: z.string() }).nullish(),
            search: z.string().optional(),
            officerId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const search = input.search?.trim();

            const conditions: any[] = [
                eq(farmer.organizationId, input.orgId),
                ne(farmer.status, "deleted"),
            ];

            if (input.officerId) {
                conditions.push(eq(saleEvents.createdBy, input.officerId));
            }

            if (input.cursor) {
                conditions.push(
                    sql`(${saleEvents.saleDate}, ${saleEvents.id}) < (${input.cursor.saleDate}, ${input.cursor.id})`
                );
            }

            if (search) {
                const pattern = `%${search}%`;
                conditions.push(
                    or(
                        ilike(farmer.name, pattern),
                        ilike(saleEvents.party, pattern),
                        ilike(saleEvents.location, pattern)
                    )!
                );
            }

            const pageRows = await ctx.db
                .select({ id: saleEvents.id, saleDate: saleEvents.saleDate })
                .from(saleEvents)
                .leftJoin(cycles, eq(saleEvents.cycleId, cycles.id))
                .leftJoin(cycleHistory, eq(saleEvents.historyId, cycleHistory.id))
                .innerJoin(
                    farmer,
                    or(eq(farmer.id, cycles.farmerId), eq(farmer.id, cycleHistory.farmerId))!
                )
                .where(and(...conditions))
                .orderBy(desc(saleEvents.saleDate), desc(saleEvents.id))
                .limit(input.limit + 1);

            const hasMore = pageRows.length > input.limit;
            const pageSlice = pageRows.slice(0, input.limit);

            if (pageSlice.length === 0) {
                return { items: [], nextCursor: null };
            }

            const pageIds = pageSlice.map(r => r.id);

            const events = await ctx.db.query.saleEvents.findMany({
                where: inArray(saleEvents.id, pageIds),
                orderBy: [desc(saleEvents.saleDate), desc(saleEvents.id)],
                with: {
                    cycle: { with: { farmer: true } },
                    history: { with: { farmer: true } },
                    reports: {
                        with: { createdByUser: { columns: { name: true } } },
                        orderBy: desc(saleReports.createdAt),
                        columns: {
                            id: true,
                            birdsSold: true,
                            birdsRejected: true,
                            totalWeight: true,
                            pricePerKg: true,
                            totalAmount: true,
                            avgWeight: true,
                            totalMortality: true,
                            cashReceived: true,
                            depositReceived: true,
                            medicineCost: true,
                            adjustmentNote: true,
                            party: true,
                            feedConsumed: true,
                            feedStock: true,
                            feedPriceUsed: true,
                            docPriceUsed: true,
                            recoveryPrice: true,
                            age: true,
                            createdAt: true,
                            officialInputDate: true,
                            saleDate: true,
                        }
                    }
                }
            });

            const items = await appendCycleContextToSales(ctx, events);
            const last = pageSlice[pageSlice.length - 1];

            return {
                items,
                nextCursor: hasMore ? { saleDate: last.saleDate, id: last.id } : null,
            };
        }),
});
```

`input.orgId` is supplied by `managementProProcedure`'s own input merge — it is already used that way in the current file, so it stays available.

- [ ] **Step 2: Type-check**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && npx tsc --noEmit`
Expected: no new errors. If `input.orgId` is reported as missing, the procedure's base input differs — check `createTRPCRouter`/`managementProProcedure` in `trpc/init.ts` and add `orgId: z.string()` to the input object to match whatever the officer-facing management routers do.

- [ ] **Step 3: Commit**

```bash
git add trpc/routers/management/sales.ts
git commit -m "feat(sales): keyset pagination and SQL filters for management sales list"
```

---

## Task 7: Drop the dead in-memory search from the context helper (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/officer/sales.ts` — `appendCycleContextToSales` signature and its tail

- [ ] **Step 1: Narrow the signature**

Change:

```typescript
export const appendCycleContextToSales = async (
    ctx: any,
    events: any[],
    search?: string,
    limit: number = 20
) => {
```

to:

```typescript
export const appendCycleContextToSales = async (
    ctx: any,
    events: any[]
) => {
```

- [ ] **Step 2: Remove the in-memory filter and slice**

At the end of the same function, replace:

```typescript
    if (search) {
        const searchLower = search.toLowerCase();
        formattedEvents = formattedEvents.filter(e =>
            e.farmerName.toLowerCase().includes(searchLower) ||
            (e.location && e.location.toLowerCase().includes(searchLower)) ||
            (e.party && e.party.toLowerCase().includes(searchLower))
        );
    }

    return formattedEvents.slice(0, limit);
};
```

with:

```typescript
    return formattedEvents;
};
```

If `formattedEvents` is now never reassigned, leave its declaration as-is — changing `let` to `const` is optional and not required by this task.

- [ ] **Step 3: Confirm no caller still passes the removed arguments**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && grep -rn "appendCycleContextToSales(" --include=*.ts . --exclude-dir=node_modules`
Expected: exactly two call sites, both `appendCycleContextToSales(ctx, events)`.

- [ ] **Step 4: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no new errors.

```bash
git add trpc/routers/officer/sales.ts
git commit -m "refactor(sales): drop in-memory search from cycle context helper"
```

---

## Task 8: Sales screen infinite scroll (mobile)

**Files:**
- Modify: `app/(drawer)/(tabs)/sales.tsx:44-56` (queries) and `:354-364` (SectionList props)

- [ ] **Step 1: Convert both queries**

Replace:

```tsx
    const officerSalesQuery = trpc.officer.sales.getRecentSales.useQuery(
        { limit: 100, search: debouncedSearch.trim() },
        { enabled: !!membership?.orgId && !isManagement }
    );
    const mgmtSalesQuery = trpc.management.sales.getRecentSales.useQuery(
        { orgId: membership?.orgId ?? "", limit: 100, search: debouncedSearch.trim(), officerId: selectedOfficerId || undefined },
        { enabled: !!membership?.orgId && isManagement }
    );
    const recentSales = isManagement ? mgmtSalesQuery.data : officerSalesQuery.data;
    const salesLoading = isManagement ? mgmtSalesQuery.isLoading : officerSalesQuery.isLoading;
    const salesError = isManagement ? mgmtSalesQuery.error : officerSalesQuery.error;
    const refetch = isManagement ? mgmtSalesQuery.refetch : officerSalesQuery.refetch;
```

with:

```tsx
    const officerSalesQuery = trpc.officer.sales.getRecentSales.useInfiniteQuery(
        { limit: 20, search: debouncedSearch.trim() },
        {
            enabled: !!membership?.orgId && !isManagement,
            getNextPageParam: (lastPage: any) => lastPage.nextCursor,
        }
    );
    const mgmtSalesQuery = trpc.management.sales.getRecentSales.useInfiniteQuery(
        { orgId: membership?.orgId ?? "", limit: 20, search: debouncedSearch.trim(), officerId: selectedOfficerId || undefined },
        {
            enabled: !!membership?.orgId && isManagement,
            getNextPageParam: (lastPage: any) => lastPage.nextCursor,
        }
    );
    const activeSalesQuery = isManagement ? mgmtSalesQuery : officerSalesQuery;
    const recentSales = activeSalesQuery.data?.pages.flatMap((p: any) => p.items) ?? [];
    const salesLoading = activeSalesQuery.isLoading;
    const salesError = activeSalesQuery.error;
    const refetch = activeSalesQuery.refetch;
    const fetchNextPage = activeSalesQuery.fetchNextPage;
    const hasNextPage = activeSalesQuery.hasNextPage;
    const isFetchingNextPage = activeSalesQuery.isFetchingNextPage;
```

`recentSales` is now always an array, never `undefined`. The date filter memo starts with `if (!recentSales) return [];` — that guard is now dead but harmless; leave it.

- [ ] **Step 2: Add paging to the SectionList**

In the `<SectionList ... >` props, after `contentContainerClassName="p-4 pb-20 pt-0"`, add:

```tsx
                        onEndReachedThreshold={0.4}
                        onEndReached={() => {
                            if (hasNextPage && !isFetchingNextPage) {
                                fetchNextPage();
                            }
                        }}
                        ListFooterComponent={
                            isFetchingNextPage ? (
                                <View className="py-6 items-center">
                                    <ActivityIndicator />
                                </View>
                            ) : null
                        }
```

- [ ] **Step 3: Import `ActivityIndicator`**

In the react-native import line, add `ActivityIndicator`:

```tsx
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, SectionList, View } from "react-native";
```

- [ ] **Step 4: Type-check**

Run: `cd c:\Users\amiba\Projects\poultry-solution && npx tsc --noEmit`
Expected: no new errors in `app/(drawer)/(tabs)/sales.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "app/(drawer)/(tabs)/sales.tsx"
git commit -m "feat(sales): infinite scroll through full sales history"
```

---

## Task 9: DOC-order cycles start at day 0 (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/officer/doc-orders.ts:276-316` (confirm loop)
- Modify: `../feed-reminder-up/modules/cycles/server/services/feed-service.ts:29`

- [ ] **Step 1: Shift the cycle date and record the real placement date**

In `confirm`, the loop currently starts:

```typescript
                for (const item of order.items) {
                    const cycleDateStr = input.cycleDates[item.id];
                    const cycleDate = cycleDateStr ? new Date(cycleDateStr) : order.orderDate;
```

Leave those three lines and the validation that follows untouched — validation must keep checking the **placement** date. Immediately before the `// Create Cycle` comment, add:

```typescript
                    // The cycle is dated the day AFTER placement so that the arrival day
                    // reads as day 0 and the first full day reads as day 1. The real
                    // placement date is preserved in officialInputDate.
                    const cycleStartDate = new Date(cycleDate);
                    cycleStartDate.setDate(cycleStartDate.getDate() + 1);
```

- [ ] **Step 2: Use it in the insert**

Replace the insert values:

```typescript
                    const [newCycle] = await tx.insert(cycles).values({
                        name: item.farmer.name, // Cycle Name = Farmer Name
                        farmerId: item.farmerId,
                        organizationId: order.orgId,
                        doc: item.docCount,
                        age: 0,
                        birdType: item.birdType,
                        createdAt: cycleStartDate,
                        officialInputDate: cycleDate,
                        status: "active"
                    }).returning();
```

- [ ] **Step 3: Record the placement date in the creation log**

Replace the log note:

```typescript
                    await tx.insert(cycleLogs).values({
                        cycleId: newCycle.id,
                        userId: ctx.user.id,
                        type: "SYSTEM",
                        valueChange: 0,
                        note: `Cycle started from DOC Order. Birds: ${item.docCount}, Type: ${item.birdType}, Placed: ${cycleDate.toLocaleDateString()}`
                    });
```

- [ ] **Step 4: Drop the age floor to 0**

In `modules/cycles/server/services/feed-service.ts`, replace:

```typescript
    const currentAge = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
```

with:

```typescript
    // Floor is 0, not 1: DOC-order cycles are dated one day ahead of placement so the
    // arrival day computes to 0. Cycles created any other way have createdAt <= today,
    // so they still floor at 1 exactly as before.
    const currentAge = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
```

- [ ] **Step 5: Type-check**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Confirm no other cycle-creation path is affected**

Run: `grep -n "Math.max(1, Math.round" -r modules trpc --include=*.ts`
Expected: two remaining hits — `trpc/routers/officer/sales.ts:86` and `modules/reports/server/services/sale-metrics-service.ts:185`. Both are fallbacks for sale rows with a NULL age and are deliberately left 1-based; do **not** change them.

- [ ] **Step 7: Commit**

```bash
git add trpc/routers/officer/doc-orders.ts modules/cycles/server/services/feed-service.ts
git commit -m "feat(doc-orders): confirmed cycles start at day 0 on placement day"
```

---

## Task 10: Mortality date guards allow the placement day (API)

**Files:**
- Modify: `../feed-reminder-up/trpc/routers/officer/cycles.ts:626-637` and `:985-996`

- [ ] **Step 1: First guard (add mortality)**

Replace:

```typescript
            if (input.date) {
                const reqTime = new Date(input.date).getTime();
                const cycleTime = new Date(current.createdAt).getTime();
```

with:

```typescript
            if (input.date) {
                const reqTime = new Date(input.date).getTime();
                // DOC-order cycles are dated the day after placement; officialInputDate holds
                // the real arrival date, so arrival-day deaths must be loggable against it.
                const cycleStart = current.officialInputDate ?? current.createdAt;
                const cycleTime = new Date(cycleStart).getTime();
```

and in the error message just below, replace `current.createdAt.toLocaleDateString()` with `new Date(cycleStart).toLocaleDateString()`.

- [ ] **Step 2: Second guard (edit mortality log)**

Replace:

```typescript
                if (input.newDate) {
                    const reqTime = new Date(input.newDate).getTime();
                    const cycleTime = new Date(activeCycle.createdAt).getTime();
```

with:

```typescript
                if (input.newDate) {
                    const reqTime = new Date(input.newDate).getTime();
                    const cycleStart = activeCycle.officialInputDate ?? activeCycle.createdAt;
                    const cycleTime = new Date(cycleStart).getTime();
```

and in its error message, replace `activeCycle.createdAt.toLocaleDateString()` with `new Date(cycleStart).toLocaleDateString()`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. If `officialInputDate` is reported missing on one of those objects, the query above it selects specific columns — add `officialInputDate: true` to that column selection.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/officer/cycles.ts
git commit -m "fix(cycles): allow mortality logs dated the actual placement day"
```

---

## Task 11: Manual verification pass

**Files:** none — run the app.

- [ ] **Step 1: Type-check both repos one final time**

Run: `cd c:\Users\amiba\Projects\feed-reminder-up && npx tsc --noEmit`
Run: `cd c:\Users\amiba\Projects\poultry-solution && npx tsc --noEmit`
Expected: no errors introduced by this plan in either repo.

- [ ] **Step 2: Start the API and the app**

Run the API dev server in `../feed-reminder-up` (`npm run dev`) and the mobile app against it. `EXPO_PUBLIC_API_MODE=development` points the app at `http://192.168.0.186:3000` — confirm that address matches the dev machine, per `lib/config/api.ts`.

- [ ] **Step 3: Feed order picker**

Open Orders → create feed order → add farmers. Scroll the list: more farmers must load past the first 20 with a spinner at the bottom. Type a farmer name that sorts late in the alphabet: they appear, and selecting them adds the row as before.

- [ ] **Step 4: Cycle create picker**

Open a cycle create modal without a preselected farmer. The picker now has a search box; searching filters, scrolling loads more, and selecting a farmer still creates a cycle end to end.

- [ ] **Step 5: Sales history**

Open Sales. Scroll down repeatedly — records older than July must load. Search by farmer name, then by buyer (party), then by location: matches from well before the first page must appear. Open a sale from a deep page and confirm remaining birds, FCR and EPI match the same sale opened from the cycle screen. Switch to management mode (if available on the test account) and repeat the scroll.

- [ ] **Step 6: DOC day 0**

Confirm a DOC order dated today. The created cycle must show age 0 today. Log mortality on that cycle dated today — it must be accepted. Tomorrow (or by moving the device/server clock) the same cycle must read age 1.

- [ ] **Step 7: Manual cycle unchanged**

Create a cycle manually with age 1 on the same day. It must still read age 1 immediately, and its feed intake figure must match what an identical cycle showed before this change.

- [ ] **Step 8: Push**

```bash
cd c:\Users\amiba\Projects\feed-reminder-up && git push
cd c:\Users\amiba\Projects\poultry-solution && git push
```

---

## Deliberately not in this plan

- Global 0-based age for manual cycles, history rows, or past sale records.
- The single-create (`age - 1`) vs bulk-create (`age`) backdating discrepancy.
- The 06:00-local age rollover caused by UTC date math in the cron and the feed service.
- Monthly DOC placement report bucketing — it keeps using `cycles.createdAt`, so a month-end placement counts in the following month, as decided.
