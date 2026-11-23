# Officer-Wise Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each officer has their own DOC, feed and base selling prices, set by the officer (and editable by management), with the organization's existing policies kept as the default and a reminder at every app launch for officers who have not set prices.

**Architecture:** `price_policies` gets a nullable `officer_id`. A pure `pickPolicy` function decides which policy applies (officer's own, then org default, then constants), and `SaleMetricsService.getPriceForDate` uses it with the farmer's officer. The officer router gets its own `pricePolicies`, the management router gains an officer scope, and the mobile price screen content is shared between a management screen (with an officer picker) and a new officer "My Prices" screen. A bottom sheet mounted in the drawer layout shows the launch reminder.

**Tech Stack:** Drizzle + tRPC v11 + zod (backend, repo `feed-reminder-up`), Expo Router + NativeWind + React Query tRPC client + date-fns (mobile, repo `poultry-solution`). No test framework exists, so tests are `tsx` + `node:assert` scripts (see `scripts/verify-farmer-visit-calc.ts`). Schema changes go out with `npm run db:push`, not migration files.

**Spec:** `docs/superpowers/specs/2026-11-23-officer-wise-prices-design.md`

## File Structure

**Backend `C:\Users\amiba\Projects\feed-reminder-up`**

| File | Responsibility |
|---|---|
| `modules/pricing/lib/pick-policy.ts` (create) | Pure `pickPolicy(rows, officerId, date)` |
| `scripts/verify-price-policy-resolution.ts` (create) | Tests for `pickPolicy` |
| `db/schema.ts` (modify) | `officer_id` column, two partial unique indexes, relation |
| `modules/reports/server/services/sale-metrics-service.ts` (modify) | `getPriceForDate(orgId, officerId, date, tx)` and its caller in `recalculateForCycle` |
| `trpc/routers/officer/sales.ts` (modify) | Pass the farmer's officer id to `getPriceForDate` in `previewSale` (line ~1187), and add `getPriceDefaults` for the form placeholders |
| `trpc/routers/management/price-policies.ts` (modify) | Officer scope on list/create/update/delete, `syncOrgPrices` limited to org defaults |
| `trpc/routers/officer/price-policies.ts` (create) | Officer's own list/create/update/delete/status |
| `trpc/routers/officer/officer.ts` (modify) | Register `pricePolicies` |
| `modules/management/ui/components/price-policies/price-policy-table.tsx` (modify) | "Applies to" column |

**Mobile `C:\Users\amiba\Projects\poultry-solution`**

| File | Responsibility |
|---|---|
| `components/prices/price-policies-content.tsx` (create) | Timeline list + add/edit sheet, parameterised by scope (extracted from `app/(drawer)/price-policies.tsx`) |
| `components/management/price-policy-bottom-sheet.tsx` (modify) | Takes `scope`, calls the officer or management mutation |
| `app/(drawer)/price-policies.tsx` (modify) | Management screen with officer picker |
| `app/(drawer)/my-prices.tsx` (create) | Officer screen |
| `app/(drawer)/_layout.tsx` (modify) | Hidden screen for `my-prices`, mounts the launch prompt |
| `components/custom-drawer-content.tsx` (modify) | "My Prices" item for officers |
| `components/prices/price-prompt-sheet.tsx` (create) | Launch reminder |
| `components/cycles/sell-modal.tsx`, `components/cycles/adjust-sale-modal.tsx` (modify) | Placeholders show the officer's current prices instead of hard-coded 145 / 3325 / 41.5 |

---

### Task 0: Branches

- [ ] **Step 1:** In both repos create `feat/officer-wise-prices` from `main` (`git switch main && git pull && git switch -c feat/officer-wise-prices`). Backend merges before mobile.

---

### Task 1: `pickPolicy` (backend, test first)

**Files:** create `scripts/verify-price-policy-resolution.ts`, `modules/pricing/lib/pick-policy.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { pickPolicy, type PolicyRow } from "../modules/pricing/lib/pick-policy";

const row = (officerId: string | null, from: string, feed = "3300"): PolicyRow => ({
    officerId,
    effectiveFrom: new Date(from),
    feedPricePerBag: feed,
    docPricePerBird: "41",
    baseSellPrice: "145",
});

const rows: PolicyRow[] = [
    row(null, "2026-01-01", "3200"),            // org default, older
    row(null, "2026-06-01", "3325"),            // org default, newer
    row("a", "2026-07-01", "3400"),             // officer a
    row("a", "2026-11-01", "3500"),             // officer a, newer
    row("b", "2026-05-01", "3100"),             // officer b
    row("a", "2027-01-01", "3999"),             // officer a, future
];

const at = (d: string) => new Date(d);

// officer's latest effective own policy wins
assert.equal(pickPolicy(rows, "a", at("2026-11-23"))!.feedPricePerBag, "3500");
// an older date uses the policy effective then
assert.equal(pickPolicy(rows, "a", at("2026-08-01"))!.feedPricePerBag, "3400");
// before the officer's first policy, the org default applies
assert.equal(pickPolicy(rows, "a", at("2026-06-15"))!.feedPricePerBag, "3325");
// an officer with no policy uses the org default, never another officer's
assert.equal(pickPolicy(rows, "c", at("2026-11-23"))!.feedPricePerBag, "3325");
// no officer id means org default only
assert.equal(pickPolicy(rows, null, at("2026-11-23"))!.feedPricePerBag, "3325");
// nothing effective yet returns null so the caller falls back to constants
assert.equal(pickPolicy(rows, "a", at("2025-12-31")), null);
assert.equal(pickPolicy([], "a", at("2026-11-23")), null);
// a policy dated exactly on the sale date is effective
assert.equal(pickPolicy(rows, "b", at("2026-05-01"))!.feedPricePerBag, "3100");

console.log("price policy resolution: all assertions passed");
```

- [ ] **Step 2:** `npx tsx scripts/verify-price-policy-resolution.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
export type PolicyRow = {
    officerId: string | null;
    effectiveFrom: Date;
    feedPricePerBag: string;
    docPricePerBird: string;
    baseSellPrice: string;
};

const latest = (rows: PolicyRow[]): PolicyRow | null =>
    rows.reduce<PolicyRow | null>((best, r) => (!best || r.effectiveFrom > best.effectiveFrom ? r : best), null);

// Officer's own latest policy effective on `date`, else the org default's, else null (caller uses constants).
export function pickPolicy(rows: PolicyRow[], officerId: string | null, date: Date): PolicyRow | null {
    const effective = rows.filter((r) => r.effectiveFrom <= date);
    const own = officerId ? latest(effective.filter((r) => r.officerId === officerId)) : null;
    return own ?? latest(effective.filter((r) => r.officerId === null));
}
```

- [ ] **Step 4:** run the script → `all assertions passed`.
- [ ] **Step 5:** commit `feat(pricing): add pickPolicy` (stage only these two files).

---

### Task 2: Schema

**Files:** modify `db/schema.ts` (`pricePolicies`, `pricePoliciesRelations`).

- [ ] **Step 1:** Add `officerId: text("officer_id").references(() => user.id, { onDelete: "cascade" }),` after `organizationId`. Replace the `unique("unique_price_policies_org_effective")` entry with:

```ts
  uniqueIndex("uq_price_policies_org_default_effective").on(t.organizationId, t.effectiveFrom).where(sql`${t.officerId} IS NULL`),
  uniqueIndex("uq_price_policies_org_officer_effective").on(t.organizationId, t.officerId, t.effectiveFrom).where(sql`${t.officerId} IS NOT NULL`),
  index("idx_price_policies_officer_id").on(t.officerId),
```

(`sql` and `uniqueIndex` are already imported in `db/schema.ts`.) Add `officer: one(user, { fields: [pricePolicies.officerId], references: [user.id] })` to `pricePoliciesRelations`.

- [ ] **Step 2:** `npx tsc --noEmit` clean. Commit `feat(pricing): add officer_id to price_policies`.
- [ ] **Step 3 (user):** run `npm run db:push` against a dev database first. It will ask about the dropped unique constraint, accept. Existing rows keep `officer_id` NULL, so they become org defaults.

---

### Task 3: Price lookup uses the officer

**Files:** modify `modules/reports/server/services/sale-metrics-service.ts`, `trpc/routers/officer/sales.ts`.

- [ ] **Step 1:** Replace `getPriceForDate` (around line 271) with:

```ts
    static async getPriceForDate(
        orgId: string,
        officerId: string | null,
        date: Date,
        tx?: any
    ): Promise<{ feedPrice: number; docPrice: number; basePrice: number }> {
        if (!orgId) {
            console.warn("[getPriceForDate] orgId is empty, falling back to default constants");
        }
        const dbConn = tx ?? db;
        // Candidates: the officer's own policies and the org defaults. pickPolicy chooses between them.
        const rows = await dbConn.query.pricePolicies.findMany({
            where: and(
                eq(pricePolicies.organizationId, orgId),
                lte(pricePolicies.effectiveFrom, date),
                officerId
                    ? or(eq(pricePolicies.officerId, officerId), isNull(pricePolicies.officerId))
                    : isNull(pricePolicies.officerId),
            ),
        });
        const policy = pickPolicy(rows, officerId, date);
        return {
            feedPrice: Number(policy?.feedPricePerBag) || FEED_PRICE_PER_BAG,
            docPrice: Number(policy?.docPricePerBird) || DOC_PRICE_PER_BIRD,
            basePrice: Number(policy?.baseSellPrice) || BASE_SELLING_PRICE,
        };
    }
```

Add imports `or`, `isNull` from `drizzle-orm` and `import { pickPolicy } from "@/modules/pricing/lib/pick-policy";`.

- [ ] **Step 2:** In `recalculateForCycle` (line ~105) change the call to `getPriceForDate(orgId, cycle.farmer?.officerId ?? null, priceDate, tx)`. The `farmer` relation is already loaded (`with: { farmer: ... }`).
- [ ] **Step 3:** In `trpc/routers/officer/sales.ts` around line 1187, find how that handler loads the cycle's farmer and pass its `officerId` as the second argument (read the 30 lines above to get the variable name, add the farmer fetch if it does not already have one).
- [ ] **Step 4:** `previewSale` is what the sell form calls for its preview and what the adjust-sale form uses (with `excludeSaleId`), so this one change covers the sale preview and sale adjustments. Saved sales go through `recalculateForCycle`, covered by Step 2.
- [ ] **Step 5:** `npx tsc --noEmit` clean. Commit `feat(pricing): price lookup uses the farmer's officer`.

---

### Task 3b: Price defaults for the sale forms (backend)

**Files:** modify `trpc/routers/officer/sales.ts`.

The sell form and adjust-sale form have optional overrides (Rec. Price, Feed/Bag, DOC/Bird) with hard-coded placeholders. When left empty the server uses the policy price, so the placeholders must show that same price.

- [ ] **Step 1:** Add a query next to `previewSale` (same access rules: the cycle's farmer belongs to the caller, or the caller is an authorized manager or admin; copy the permission block from `previewSale`, reading the 20 lines above line 1170 for it):

```ts
    getPriceDefaults: protectedProcedure
        .input(z.object({
            cycleId: z.string().optional(),
            historyId: z.string().optional(),
            date: z.string().datetime().optional(), // the sale date, defaults to now
        }))
        .query(async ({ ctx, input }) => {
            // load the cycle (or history) with its farmer, run the same permission checks as previewSale
            const prices = await SaleMetricsService.getPriceForDate(orgId, farmer.officerId, input.date ? new Date(input.date) : new Date());
            return prices; // { feedPrice, docPrice, basePrice }
        }),
```

- [ ] **Step 2:** `npx tsc --noEmit` clean. Commit `feat(pricing): expose the effective prices for the sale forms`.

---

### Task 4: Management router, officer scope

**Files:** modify `trpc/routers/management/price-policies.ts`.

- [ ] **Step 1: list** takes `officerId: z.string().optional()` (a user id, `"default"`, or omitted for everything). Select with a left join to `user` for the name:

```ts
    list: managementProcedure
        .input(z.object({ officerId: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            const scope =
                input.officerId === "default" ? isNull(pricePolicies.officerId)
                : input.officerId ? eq(pricePolicies.officerId, input.officerId)
                : undefined;
            const rows = await ctx.db
                .select({ policy: pricePolicies, officerName: user.name })
                .from(pricePolicies)
                .leftJoin(user, eq(pricePolicies.officerId, user.id))
                .where(and(eq(pricePolicies.organizationId, input.orgId), scope))
                .orderBy(desc(pricePolicies.effectiveFrom));
            return rows.map((r) => ({ ...r.policy, officerName: r.officerName }));
        }),
```

Existing callers that pass only `orgId` keep working (they now also get officer policies, so Task 8 updates the mobile screen to pass `officerId: "default"` until the picker exists).

- [ ] **Step 2: create** adds `officerId: z.string().optional()` to its input and sets `officerId: input.officerId ?? null` in the insert. When an `officerId` is given, verify that user is an ACTIVE member of `input.orgId` (query `member`), otherwise `BAD_REQUEST`. Keep the 23505 conflict message.
- [ ] **Step 3: update and delete** already load the policy by `id` and `organizationId`, so they work for officer policies unchanged. Do not allow changing `officerId` in update.
- [ ] **Step 4: syncOrgPrices** must only consider org defaults: add `isNull(pricePolicies.officerId)` to its `where`, and only call it from create/update/delete when the affected policy's `officerId` is null (load the row first in update/delete, use the input in create).
- [ ] **Step 5:** `npx tsc --noEmit` clean. Commit `feat(pricing): management price policies accept an officer scope`.

---

### Task 5: Officer router

**Files:** create `trpc/routers/officer/price-policies.ts`; modify `trpc/routers/officer/officer.ts`.

- [ ] **Step 1:** Use `orgProcedure` (adds `orgId` and checks active membership). Own policies only (`officerId = ctx.user.id`):

```ts
import { member, pricePolicies } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, orgProcedure } from "../../init";

const policyInput = z.object({
    effectiveFrom: z.string().datetime(),
    feedPricePerBag: z.number().positive(),
    docPricePerBird: z.number().positive(),
    baseSellPrice: z.number().positive(),
});

const conflict = (err: any) => {
    if (err?.code === "23505") {
        throw new TRPCError({ code: "CONFLICT", message: "You already have prices for this exact date and time. Choose a different effective date." });
    }
    throw err;
};

export const officerPricePoliciesRouter = createTRPCRouter({
    list: orgProcedure.query(({ ctx, input }) =>
        ctx.db.select().from(pricePolicies)
            .where(and(eq(pricePolicies.organizationId, input.orgId), eq(pricePolicies.officerId, ctx.user.id)))
            .orderBy(desc(pricePolicies.effectiveFrom))),

    // Used by the launch reminder: has this officer set prices that apply today?
    status: orgProcedure.query(async ({ ctx, input }) => {
        const [row] = await ctx.db.select({ id: pricePolicies.id }).from(pricePolicies)
            .where(and(
                eq(pricePolicies.organizationId, input.orgId),
                eq(pricePolicies.officerId, ctx.user.id),
                lte(pricePolicies.effectiveFrom, new Date()),
            )).limit(1);
        return { hasOwnPolicy: !!row };
    }),

    create: orgProcedure.input(policyInput).mutation(async ({ ctx, input }) => {
        try {
            const [created] = await ctx.db.insert(pricePolicies).values({
                organizationId: input.orgId,
                officerId: ctx.user.id,
                effectiveFrom: new Date(input.effectiveFrom),
                feedPricePerBag: String(input.feedPricePerBag),
                docPricePerBird: String(input.docPricePerBird),
                baseSellPrice: String(input.baseSellPrice),
            }).returning();
            return created;
        } catch (err) { return conflict(err); }
    }),

    update: orgProcedure.input(policyInput.partial().extend({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const { id, orgId, ...rest } = input as typeof input & { orgId: string };
        const [existing] = await ctx.db.select().from(pricePolicies)
            .where(and(eq(pricePolicies.id, id), eq(pricePolicies.organizationId, orgId), eq(pricePolicies.officerId, ctx.user.id)));
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Price policy not found" });
        try {
            const [updated] = await ctx.db.update(pricePolicies).set({
                ...(rest.effectiveFrom ? { effectiveFrom: new Date(rest.effectiveFrom) } : {}),
                ...(rest.feedPricePerBag != null ? { feedPricePerBag: String(rest.feedPricePerBag) } : {}),
                ...(rest.docPricePerBird != null ? { docPricePerBird: String(rest.docPricePerBird) } : {}),
                ...(rest.baseSellPrice != null ? { baseSellPrice: String(rest.baseSellPrice) } : {}),
                updatedAt: new Date(),
            }).where(eq(pricePolicies.id, id)).returning();
            return updated;
        } catch (err) { return conflict(err); }
    }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const [existing] = await ctx.db.select().from(pricePolicies)
            .where(and(eq(pricePolicies.id, input.id), eq(pricePolicies.organizationId, input.orgId), eq(pricePolicies.officerId, ctx.user.id)));
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Price policy not found" });
        await ctx.db.delete(pricePolicies).where(eq(pricePolicies.id, input.id));
        return { success: true };
    }),
});
```

(`member` import is not needed here, drop it if unused. The `as typeof input & { orgId }` cast exists because `orgProcedure`'s merged input type already includes `orgId`; if tsc accepts `input.orgId` directly, use that.)

- [ ] **Step 2:** register `pricePolicies: officerPricePoliciesRouter` in `trpc/routers/officer/officer.ts`.
- [ ] **Step 3:** `npx tsc --noEmit` clean. Commit `feat(pricing): officers manage their own price policies`.

---

### Task 6: Web table column

**Files:** modify `modules/management/ui/components/price-policies/price-policy-table.tsx` (and the view if it types the rows).

- [ ] **Step 1:** Add an "Applies to" column showing `row.officerName ?? "Org default"`. Read the file first and follow its column pattern. The `list` response now includes `officerName`.
- [ ] **Step 2:** `npx tsc --noEmit` clean. Commit `feat(pricing): show who a price policy applies to on the web`.

Push the backend branch and open the PR here. Deploy needs `npm run db:push` first.

---

### Task 7: Mobile bottom sheet takes a scope

**Files:** modify `components/management/price-policy-bottom-sheet.tsx`.

- [ ] **Step 1:** Add a prop `scope: { kind: "mine" } | { kind: "officer"; officerId: string | null }` (`null` = org default). The component currently hardcodes `trpc.management.pricePolicies.create/update` and invalidates `management.pricePolicies.list`.
  - `kind: "mine"`: use `trpc.officer.pricePolicies.create/update` and invalidate `officer.pricePolicies.list` and `officer.pricePolicies.status`.
  - `kind: "officer"`: keep the management mutations, send `officerId: scope.officerId ?? undefined` on create, and invalidate `management.pricePolicies.list`.
- [ ] **Step 2:** Default the effective date to start of today for a new policy so it applies to current cycles immediately, with the existing date picker to change it.
- [ ] **Step 3:** Typecheck, commit `feat(prices): price policy sheet works for officers`.

---

### Task 8: Shared content, management picker, My Prices

**Files:** create `components/prices/price-policies-content.tsx`, `app/(drawer)/my-prices.tsx`; modify `app/(drawer)/price-policies.tsx`.

- [ ] **Step 1:** Move the timeline list, empty state, delete confirm and add/edit sheet wiring from `app/(drawer)/price-policies.tsx` into `PricePoliciesContent({ scope })`. The query depends on scope: `mine` uses `trpc.officer.pricePolicies.list.useQuery({ orgId })`, `officer` uses `trpc.management.pricePolicies.list.useQuery({ orgId, officerId: scope.officerId ?? "default" })`, and delete uses the matching mutation. Keep `PolicyTimelineRow` as is.
- [ ] **Step 2:** `app/(drawer)/price-policies.tsx` becomes: management-only guard (as today), `ScreenHeader`, an `OfficerSelector` (read how `app/(drawer)/performance.tsx` uses it with `disableGlobal` and its own `selectedOfficerId` state) plus an "Org default" choice, and `<PricePoliciesContent scope={{ kind: "officer", officerId }} />`. Title text under the picker: "Org default" or the officer's name.
- [ ] **Step 3:** `app/(drawer)/my-prices.tsx`: `ScreenHeader title="My Prices"`, `<PricePoliciesContent scope={{ kind: "mine" }} />`. Accept an `add=1` search param that opens the add sheet immediately (used by the launch reminder).
- [ ] **Step 4:** Typecheck, commit `feat(prices): management officer picker and officer My Prices screen`.

---

### Task 9: Drawer entries

**Files:** modify `app/(drawer)/_layout.tsx`, `components/custom-drawer-content.tsx`.

- [ ] **Step 1:** Register the hidden `my-prices` screen in `_layout.tsx` (same options as `price-policies`).
- [ ] **Step 2:** Add `{ label: "My Prices", icon: Tag, route: "/(drawer)/my-prices" }` to the officer item list (put it in `officerActivityItems` or `officerCoreItems`, after Stock). No `isPro`.
- [ ] **Step 3:** Typecheck, commit `feat(prices): My Prices drawer item for officers`.

---

### Task 10: Launch reminder

**Files:** create `components/prices/price-prompt-sheet.tsx`; modify `app/(drawer)/_layout.tsx`.

- [ ] **Step 1:** The component, using the app's `BottomSheetModal`:

```tsx
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

// Lives for the app process, so "Later" hides the reminder until the next app launch.
let dismissedThisLaunch = false;

export function PricePromptSheet() {
    const router = useRouter();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isOfficer = membership?.status === "ACTIVE" && membership.activeMode === "OFFICER";
    const status = trpc.officer.pricePolicies.status.useQuery(
        { orgId: membership?.orgId ?? "" },
        { enabled: isOfficer && !!membership?.orgId },
    );
    const [dismissed, setDismissed] = useState(dismissedThisLaunch);

    const open = isOfficer && status.data?.hasOwnPolicy === false && !dismissed;
    const later = () => { dismissedThisLaunch = true; setDismissed(true); };

    return (
        <BottomSheetModal open={open} onOpenChange={(o) => { if (!o) later(); }}>
            <View className="p-6 gap-4">
                <Text className="text-xl font-bold text-foreground">Set your prices</Text>
                <Text className="text-sm text-muted-foreground">
                    You have not set your own DOC, feed and selling prices yet, so your profit numbers use the organization defaults.
                </Text>
                <Button className="h-12 rounded-xl" onPress={() => { later(); router.push("/(drawer)/my-prices?add=1" as any); }}>
                    <Text className="font-bold">Set prices</Text>
                </Button>
                <Button variant="outline" className="h-12 rounded-xl" onPress={later}>
                    <Text className="font-bold">Later</Text>
                </Button>
            </View>
        </BottomSheetModal>
    );
}
```

- [ ] **Step 2:** Render `<PricePromptSheet />` once in `app/(drawer)/_layout.tsx`, beside the `Drawer` inside the existing wrapper `View`.
- [ ] **Step 3:** Typecheck, commit `feat(prices): remind officers without prices on every app launch`.

---

### Task 10b: Sale form placeholders (mobile)

**Files:** modify `components/cycles/sell-modal.tsx` (placeholders at lines ~999, 1016, 1033) and `components/cycles/adjust-sale-modal.tsx` (the same three fields).

- [ ] **Step 1:** In each modal add `const defaults = trpc.officer.sales.getPriceDefaults.useQuery({ cycleId / historyId, date }, { enabled: open })`, using the same cycle or history id the modal already has, and the sale date from the form (for the adjust modal, the sale's own date).
- [ ] **Step 2:** Replace the hard-coded placeholders with `defaults.data?.basePrice`, `defaults.data?.feedPrice` and `defaults.data?.docPrice` (as strings), falling back to the old constants while loading. Add a small caption under the three fields: "Leave empty to use your prices".
- [ ] **Step 3:** The adjust modal still pre-fills the sale's saved prices as values; the placeholder only shows when a field is cleared. Do not change that behaviour.
- [ ] **Step 4:** Typecheck, commit `feat(prices): sale forms show the officer's current prices as placeholders`.

---

### Task 11: Changelog, verification, PRs

- [ ] **Step 1:** `node add-changelog.js "Each officer can now set their own DOC, feed and selling prices from My Prices, and profit numbers use them. Officers who have not set prices are reminded when the app opens, and until then the organization prices apply. Managers can view and edit any officer's prices from Price Policies" --type Added`.
- [ ] **Step 2:** Run both test scripts and `npx tsc --noEmit` in both repos (only errors in touched files matter).
- [ ] **Step 3: Manual checklist** (dev data):
  1. Officer with no policy opens the app: reminder shows. "Later" hides it, kill and reopen shows it again. After setting prices it no longer shows.
  2. "Set prices" opens My Prices with the add sheet. Saving a policy dated today works, the same date again gives the conflict message.
  3. A sale for that officer's farmer stores the officer's feed and DOC prices. A colleague with no policy still gets the org default.
  4. Management: Price Policies shows the org default timeline, picking an officer shows that officer's, creating and deleting in each scope works and does not change the org default. The organization row prices still follow only the latest org default.
  5. A view-only manager cannot create or delete.
  6. Web price policy table shows "Org default" and officer names.
  7. Existing sales and reports are unchanged.
  8. Sell form: with no override typed, the Rec. Price, Feed/Bag and DOC/Bird placeholders show the officer's current prices (and the org default's for an officer without a policy). The preview and the saved sale use those same prices.
  9. Adjust sale: fields keep the sale's saved prices, clearing one shows the current price as the placeholder, and saving recalculates with the officer's price.
- [ ] **Step 4:** Push both branches, open PRs (backend first, with the `db:push` note), do not merge.

## Self-review notes

- **Spec coverage:** schema and unique rules (Task 2), lookup order (Tasks 1, 3), officer and management APIs (Tasks 4, 5), web column (Task 6), mobile screens and picker (Tasks 7, 8), drawer (Task 9), launch reminder (Task 10), changelog and checks (Task 11).
- **Open details to confirm during Task 3:** the `getPriceForDate` caller in `previewSale` may not have the farmer's officer loaded (it reads `cycle.farmer`, check the `with` clause); and `OfficerSelector`'s `disableGlobal` behaviour (Task 8) should be read before use.
- **Sale forms** (Tasks 3, 3b, 10b): preview, saved sales, adjustments and placeholders all resolve prices through the same `getPriceForDate`, so they cannot disagree.
