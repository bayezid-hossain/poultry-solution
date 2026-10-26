# Farmer Visit Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Officers and managers can create, list, filter, sort, edit, delete and copy "running farm visit" reports per cycle, with auto-calculated FCR, standard values from the database, and cycle mortality kept in sync.

**Architecture:** Backend (`feed-reminder-up`) gets two tables (`standard_values`, `farmer_visit_reports`), pure calc helpers, a service module, and thin officer and management tRPC routers. Mobile (`poultry-solution`) gets a shared formatter/calc lib, a list screen in the drawer, a form screen under `app/cycle/[id]/`, and a "Farmer Visit" action in the cycle menus. The mobile app imports backend router types from the sibling path `../../feed-reminder-up`, so backend types flow straight into mobile.

**Tech Stack:** Next.js + tRPC v11 + Drizzle (Postgres/Neon) + zod on the backend; Expo Router + NativeWind + React Query tRPC client + date-fns on mobile. No test framework exists in either repo, so tests are `tsx` scripts using `node:assert` (the repo convention, see `feed-reminder-up/scripts/verify-bird-math.ts`).

**Design notes (UI):** The `design-taste-frontend` skill targets web landing pages and lists native mobile as out of scope, so only its universal rules are applied here: reuse the app's existing tokens (green `primary` accent, `rounded-2xl` cards, `border-border/50`) with no second accent; one radius system; readable contrast; loading, empty and error states on every screen; tactile `active:` press feedback; no em-dashes in any visible copy; no emojis; icons from `lucide-react-native` only (the project's existing family). It is not a landing page, so hero, marquee and motion rules do not apply.

**Spec:** `docs/superpowers/specs/2026-10-26-farmer-visit-reports-design.md`

## Deviations from the spec (decided while planning)

1. **Standard table is days 0 to 35, not 0 to 34.** The supplied image has 36 rows. Days 36 to 40 are extrapolated (five rows, not six). The spec table is corrected in Task 0.
2. **Suggested age is computed on the mobile client**, not the server, using the device calendar (same rule as `updateCycleFeed`: `max(0, daysBetween + 1)`). This avoids server-UTC versus Dhaka off-by-one errors. The server still validates the date with a one-day buffer.
3. **Cycle mortality is only synced while `birds_out = 0`.** `correctMortality` forbids changing mortality once sales started. A visit during selling still saves the report, but the cycle is left alone and the response says `mortalitySynced: false`.
4. **Reports re-point on end and reopen.** Ending a cycle deletes the `cycles` row (logs and sale events move to `cycle_history`). Reports need the same treatment, so `farmer_visit_reports` has both `cycle_id` and `history_id`, and `endCycleLogic` plus both reopen paths update them. Without this, ending a cycle would cascade-delete its reports.
5. **No Pro gating** on this feature (not requested). Management mutations require `accessLevel === "EDIT"` like price policies.
6. **Zero-padding:** bag counts under 10 are shown with two digits everywhere in the message ("09 bags", "04 bags", "00 bags"). Pieces ("pcs") and weights are not padded.

## File Structure

**Backend repo `C:\Users\amiba\Projects\feed-reminder-up`**

| File | Responsibility |
|---|---|
| `modules/farmer-visits/lib/standard-values.ts` (create) | The 41 standard rows (day 0 to 40) as data |
| `modules/farmer-visits/lib/calc.ts` (create) | Pure functions: clamp day, sum feed, live birds, avg FCR, date validation |
| `scripts/verify-farmer-visit-calc.ts` (create) | `node:assert` tests for the two files above |
| `db/schema.ts` (modify) | `standardValues`, `farmerVisitReports` tables |
| `drizzle/00NN_*.sql` + `meta/` (generated) | Migration |
| `scripts/seed-standard-values.ts` (create) | Idempotent seed of `standard_values` |
| `modules/farmer-visits/server/schemas.ts` (create) | Shared zod input schemas |
| `modules/farmer-visits/server/farmer-visit-service.ts` (create) | All DB logic: prefill, save (with mortality sync), list, get, delete, getStandard |
| `trpc/routers/officer/farmer-visits.ts` (create) | Officer router (scope: own farmers) |
| `trpc/routers/management/farmer-visits.ts` (create) | Management router (scope: whole org) |
| `trpc/routers/officer/officer.ts`, `trpc/routers/management/management.ts` (modify) | Register routers |
| `modules/cycles/server/services/cycle-service.ts`, `reopen-cycle-service.ts`, `trpc/routers/officer/cycles.ts` (modify) | Re-point reports on end and reopen |

**Mobile repo `C:\Users\amiba\Projects\poultry-solution`**

| File | Responsibility |
|---|---|
| `lib/farmer-visit.ts` (create) | Types, default suggestions, sums, FCR, age, message formatter |
| `scripts/verify-farmer-visit.ts` (create) | `node:assert` tests for the lib |
| `lib/use-farmer-visit-api.ts` (create) | Picks officer or management router by active mode |
| `components/farmer-visits/date-field.tsx` (create) | Date picker field (`yyyy-MM-dd` strings) |
| `components/farmer-visits/feed-lines-editor.tsx` (create) | Dynamic feed-type rows |
| `components/farmer-visits/visit-card.tsx` (create) | List card with copy and delete |
| `app/cycle/[id]/farmer-visit.tsx` (create) | Create/edit form screen |
| `app/(drawer)/farmer-visits.tsx` (create) | List screen with search, date range, sort |
| `app/(drawer)/_layout.tsx` (modify) | Register hidden drawer screen |
| `components/custom-drawer-content.tsx` (modify) | Drawer items (officer + management) |
| `components/cycles/cycle-card.tsx` (modify) | "Farmer Visit" action in card menu |
| `app/cycle/[id].tsx` (modify) | Same action in the cycle detail menu |

---

### Task 0: Branches and spec correction

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-farmer-visit-reports-design.md`

- [ ] **Step 1: Create feature branches**

```bash
cd /c/Users/amiba/Projects/poultry-solution && git switch -c feat/farmer-visit-reports
cd /c/Users/amiba/Projects/feed-reminder-up && git fetch -q && git switch -c feat/farmer-visit-reports origin/main
```

Expected: both repos on `feat/farmer-visit-reports`. If the backend `origin/main` is not the base you want (the repo was on `fix/verify-rejected-totals`), stop and ask.

- [ ] **Step 2: Correct the standard table in the spec**

In the spec file, replace the line `Days 0–34 come from the supplied Ross table. Days 35–40 are extrapolated:` with `Days 0–35 come from the supplied Ross table (36 rows). Days 36–40 are extrapolated:` and replace the table body with:

```markdown
| day | daily_feed_g | body_weight_g | fcr |
|---|---|---|---|
| 36 | 195 | 2291 | 1.548 |
| 37 | 201 | 2392 | 1.566 |
| 38 | 207 | 2494 | 1.584 |
| 39 | 213 | 2597 | 1.602 |
| 40 | 219 | 2701 | 1.620 |
```

Also replace `- Suggested age = whole days from cycle start to \`visit_date\`` with `- Suggested age = \`max(0, calendar days from cycle start to visit_date + 1)\`, computed on the mobile client`, and replace `- \`farmerVisit.getPrefill({ cycleId, date })\` → farmer, location, DOC, strain, suggested age,` with `- \`farmerVisit.getPrefill({ cycleId, date })\` → farmer, location, DOC, strain, cycle start date,`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/amiba/Projects/poultry-solution
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: correct farmer visit std table and add implementation plan

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Backend pure logic (standard values and calc), test first

**Files:**
- Create: `feed-reminder-up/scripts/verify-farmer-visit-calc.ts`
- Create: `feed-reminder-up/modules/farmer-visits/lib/standard-values.ts`
- Create: `feed-reminder-up/modules/farmer-visits/lib/calc.ts`

- [ ] **Step 1: Write the failing test**

`scripts/verify-farmer-visit-calc.ts`:

```ts
import assert from "node:assert/strict";
import {
    calcAvgFcr,
    calcLiveBirds,
    clampStdDay,
    sumFeed,
    validateVisitDate,
    type FeedLine,
} from "../modules/farmer-visits/lib/calc";
import { STANDARD_VALUES } from "../modules/farmer-visits/lib/standard-values";

// --- standard table shape ---
assert.equal(STANDARD_VALUES.length, 41, "days 0..40");
STANDARD_VALUES.forEach((r, i) => assert.equal(r.day, i, `day ${i} in order`));
assert.deepEqual(STANDARD_VALUES[0], { day: 0, dailyFeedG: 0, bodyWeightG: 42, fcr: null });
assert.deepEqual(STANDARD_VALUES[20], { day: 20, dailyFeedG: 105, bodyWeightG: 865, fcr: 1.25 });
assert.deepEqual(STANDARD_VALUES[35], { day: 35, dailyFeedG: 189, bodyWeightG: 2191, fcr: 1.53 });
for (let d = 1; d <= 40; d++) {
    assert.ok(STANDARD_VALUES[d].bodyWeightG > STANDARD_VALUES[d - 1].bodyWeightG, `weight rises at ${d}`);
}

// --- clampStdDay ---
assert.equal(clampStdDay(-3), 0);
assert.equal(clampStdDay(20), 20);
assert.equal(clampStdDay(55), 40);
assert.equal(clampStdDay(12.9), 12);

// --- sumFeed ---
const lines: FeedLine[] = [
    { type: "B1", intake: 15, running: 15, stock: 0 },
    { type: "B2", intake: 13, running: 9, stock: 4 },
    { type: "Starter", intake: 0.5, running: 0.25, stock: 1 },
];
assert.equal(sumFeed(lines, "intake"), 28.5);
assert.equal(sumFeed(lines, "running"), 24.25);
assert.equal(sumFeed(lines, "stock"), 5);
assert.equal(sumFeed([], "running"), 0);

// --- calcLiveBirds ---
assert.equal(calcLiveBirds(1000, 11, 0), 989);
assert.equal(calcLiveBirds(1000, 11, 300), 689);
assert.equal(calcLiveBirds(10, 20, 0), 0, "never negative");

// --- calcAvgFcr: 24 bags = 1200 kg, 0.91 kg * 989 birds = 899.99 kg ---
assert.equal(calcAvgFcr({ runningBags: 24, avgWeightG: 910, liveBirds: 989 }), 1.333);
assert.equal(calcAvgFcr({ runningBags: 24, avgWeightG: 0, liveBirds: 989 }), 0);
assert.equal(calcAvgFcr({ runningBags: 24, avgWeightG: 910, liveBirds: 0 }), 0);

// --- validateVisitDate (one-day buffer each side for timezone skew) ---
const start = new Date("2026-10-01T00:00:00Z");
const now = new Date("2026-10-26T10:00:00Z");
assert.equal(validateVisitDate("2026-10-26", start, now), null);
assert.equal(validateVisitDate("2026-10-27", start, now), null, "buffer after");
assert.match(validateVisitDate("2026-10-28", start, now)!, /future/);
assert.equal(validateVisitDate("2026-09-30", start, now), null, "buffer before");
assert.match(validateVisitDate("2026-09-29", start, now)!, /before the cycle start/);
assert.match(validateVisitDate("26/10/2026", start, now)!, /format/);

console.log("farmer-visit calc: all assertions passed");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx tsx scripts/verify-farmer-visit-calc.ts
```

Expected: FAIL with `Cannot find module '../modules/farmer-visits/lib/calc'`.

- [ ] **Step 3: Write `standard-values.ts`**

```ts
export type StandardRow = {
    day: number;
    dailyFeedG: number;
    bodyWeightG: number;
    fcr: number | null;
};

// Days 0..35 are the supplied Ross table. Days 36..40 are EXTRAPOLATED from the last
// six days of that table (+100..104 g/day weight, +6 g/day feed, +0.018 FCR/day).
const DAILY_FEED_G = [
    0, 13, 17, 21, 23, 27, 31, 35, 39, 44, 48, 54, 58, 64, 68, 75, 81, 87, 93, 98,
    105, 111, 117, 123, 130, 134, 141, 148, 152, 158, 163, 169, 174, 180, 182, 189,
    // extrapolated 36..40
    195, 201, 207, 213, 219,
];

const BODY_WEIGHT_G = [
    42, 56, 72, 89, 109, 131, 157, 185, 215, 247, 283, 321, 364, 412, 465, 524, 586, 651, 719, 790,
    865, 943, 1023, 1104, 1186, 1269, 1353, 1438, 1524, 1613, 1705, 1799, 1895, 1993, 2092, 2191,
    // extrapolated 36..40
    2291, 2392, 2494, 2597, 2701,
];

// Day 0 has no FCR.
const FCR = [
    null, 0.232, 0.417, 0.573, 0.679, 0.773, 0.841, 0.902, 0.956, 1.012, 1.053, 1.097, 1.126, 1.15,
    1.165, 1.177, 1.191, 1.206, 1.221, 1.235, 1.25, 1.264, 1.284, 1.303, 1.321, 1.337, 1.356, 1.373,
    1.402, 1.423, 1.442, 1.46, 1.478, 1.496, 1.512, 1.53,
    // extrapolated 36..40
    1.548, 1.566, 1.584, 1.602, 1.62,
];

export const STANDARD_VALUES: StandardRow[] = DAILY_FEED_G.map((dailyFeedG, day) => ({
    day,
    dailyFeedG,
    bodyWeightG: BODY_WEIGHT_G[day],
    fcr: FCR[day],
}));
```

- [ ] **Step 4: Write `calc.ts`**

```ts
export type FeedLine = { type: string; intake: number; running: number; stock: number };

export const MAX_STD_DAY = 40;
export const KG_PER_BAG = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export function clampStdDay(age: number): number {
    return Math.min(MAX_STD_DAY, Math.max(0, Math.trunc(age)));
}

export function sumFeed(lines: FeedLine[], key: "intake" | "running" | "stock"): number {
    const total = lines.reduce((sum, l) => sum + (Number.isFinite(l[key]) ? l[key] : 0), 0);
    return Math.round(total * 100) / 100;
}

export function calcLiveBirds(doc: number, mortality: number, birdsOut: number): number {
    return Math.max(0, doc - mortality - birdsOut);
}

// FCR = feed consumed (kg) / (avg weight kg * live birds). "Running" bags are the consumed feed.
export function calcAvgFcr(p: { runningBags: number; avgWeightG: number; liveBirds: number }): number {
    const liveWeightKg = (p.avgWeightG / 1000) * p.liveBirds;
    if (liveWeightKg <= 0) return 0;
    return Math.round(((p.runningBags * KG_PER_BAG) / liveWeightKg) * 1000) / 1000;
}

// visitDate is "yyyy-MM-dd". The server runs in UTC while farms are not, so both bounds
// carry a one-day buffer instead of comparing against exact local midnights.
export function validateVisitDate(visitDate: string, cycleStart: Date, now: Date): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(new Date(visitDate).getTime())) {
        return "Invalid date format, expected yyyy-MM-dd";
    }
    const earliest = new Date(cycleStart.getTime() - DAY_MS).toISOString().slice(0, 10);
    const latest = new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
    if (visitDate < earliest) return "Visit date cannot be before the cycle start date";
    if (visitDate > latest) return "Visit date cannot be in the future";
    return null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx tsx scripts/verify-farmer-visit-calc.ts
```

Expected: `farmer-visit calc: all assertions passed`.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up
git add scripts/verify-farmer-visit-calc.ts modules/farmer-visits/lib
git commit -m "feat(farmer-visits): add standard values and calc helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Schema, migration, seed

**Files:**
- Modify: `feed-reminder-up/db/schema.ts` (imports at top; append tables after `cycleLogs`, around line 293)
- Generate: `feed-reminder-up/drizzle/*`
- Create: `feed-reminder-up/scripts/seed-standard-values.ts`

- [ ] **Step 1: Add imports**

In the `drizzle-orm/pg-core` import block at the top of `db/schema.ts`, add `date` and `jsonb` (keep alphabetical):

```ts
import {
  boolean,
  date,
  decimal,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
```

Also add near the top (after the imports): `import type { FeedLine } from "@/modules/farmer-visits/lib/calc";`

- [ ] **Step 2: Append the tables** after the `cycleLogs` definition (before the `// db/schema.ts` comment):

```ts
// Global standard growth table (Ross), days 0..40. Seeded by scripts/seed-standard-values.ts.
export const standardValues = pgTable("standard_values", {
  day: integer("day").primaryKey(),
  dailyFeedG: integer("daily_feed_g").notNull(),
  bodyWeightG: integer("body_weight_g").notNull(),
  fcr: decimal("fcr", { precision: 6, scale: 3 }),
});

// Farmer visit reports. Like cycle_logs, a report belongs to EITHER an active cycle OR a
// history record: endCycleLogic and the reopen paths move it between the two.
export const farmerVisitReports = pgTable("farmer_visit_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  farmerId: text("farmer_id").notNull().references(() => farmer.id, { onDelete: "cascade" }),
  cycleId: text("cycle_id").references(() => cycles.id, { onDelete: "cascade" }),
  historyId: text("history_id").references(() => cycleHistory.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id),

  visitDate: date("visit_date", { mode: "string" }).notNull(),
  cycleName: text("cycle_name").notNull(),
  age: integer("age").notNull(),
  docCount: integer("doc_count").notNull(),
  strain: text("strain"),

  todayMortality: integer("today_mortality").notNull().default(0),
  totalMortality: integer("total_mortality").notNull().default(0),

  avgWeightG: integer("avg_weight_g").notNull().default(0),
  stdWeightG: integer("std_weight_g"),
  stdFcr: decimal("std_fcr", { precision: 6, scale: 3 }),
  avgFcr: decimal("avg_fcr", { precision: 6, scale: 3 }).notNull().default("0"),

  feedLines: jsonb("feed_lines").$type<FeedLine[]>().notNull().default([]),

  litter: text("litter").notNull().default(""),
  disease: text("disease").notNull().default(""),
  medicine: text("medicine").notNull().default(""),
  suggestions: text("suggestions").notNull().default(""),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("uq_visit_cycle_date").on(t.cycleId, t.visitDate),
  index("idx_visit_org_date").on(t.organizationId, t.visitDate),
  index("idx_visit_farmer_id").on(t.farmerId),
  index("idx_visit_history_id").on(t.historyId),
]);
```

`unique(...)` on a nullable `cycle_id` is intentional: Postgres treats NULLs as distinct, so ended-cycle rows (cycle_id null) never collide.

- [ ] **Step 3: Generate the migration**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx drizzle-kit generate --name farmer_visit_reports
```

Expected: a new `drizzle/00NN_farmer_visit_reports.sql` with `CREATE TABLE "standard_values"` and `CREATE TABLE "farmer_visit_reports"`, plus an updated `drizzle/meta/_journal.json` and snapshot. Open the SQL and confirm it contains only these two tables and their FK/index/unique statements. If it contains unrelated `ALTER`s (schema drift), stop and report instead of committing them.

- [ ] **Step 4: Write the seed script**

`scripts/seed-standard-values.ts` (same style as `seed-price-policies.ts`):

```ts
import "dotenv/config";
import { db } from "@/db";
import { standardValues } from "@/db/schema";
import { STANDARD_VALUES } from "@/modules/farmer-visits/lib/standard-values";
import { sql } from "drizzle-orm";

async function main() {
    console.log(`Seeding ${STANDARD_VALUES.length} standard value rows...`);

    for (const row of STANDARD_VALUES) {
        const values = {
            day: row.day,
            dailyFeedG: row.dailyFeedG,
            bodyWeightG: row.bodyWeightG,
            fcr: row.fcr === null ? null : row.fcr.toFixed(3),
        };
        await db.insert(standardValues).values(values).onConflictDoUpdate({
            target: standardValues.day,
            set: {
                dailyFeedG: sql`excluded.daily_feed_g`,
                bodyWeightG: sql`excluded.body_weight_g`,
                fcr: sql`excluded.fcr`,
            },
        });
    }

    console.log("Done.");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
```

- [ ] **Step 5: Apply to the dev database and seed**

Confirm `DATABASE_URL` in `.env` points at a **dev** database first (print the host only: `grep -o '@[^/]*' .env | head -1`). Do not run against production here.

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx drizzle-kit migrate && npx tsx scripts/seed-standard-values.ts
```

Expected: migration applies, then `Seeding 41 standard value rows...` and `Done.`. Re-run the seed once to confirm it is idempotent (no error).

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts drizzle scripts/seed-standard-values.ts
git commit -m "feat(farmer-visits): add standard_values and farmer_visit_reports tables

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Service, schemas, routers

**Files:**
- Create: `feed-reminder-up/modules/farmer-visits/server/schemas.ts`
- Create: `feed-reminder-up/modules/farmer-visits/server/farmer-visit-service.ts`
- Create: `feed-reminder-up/trpc/routers/officer/farmer-visits.ts`
- Create: `feed-reminder-up/trpc/routers/management/farmer-visits.ts`
- Modify: `feed-reminder-up/trpc/routers/officer/officer.ts`, `feed-reminder-up/trpc/routers/management/management.ts`

- [ ] **Step 1: Shared zod schemas** (`schemas.ts`)

```ts
import { z } from "zod";

const bags = z.number().min(0).max(100000);

export const feedLineSchema = z.object({
    type: z.string().trim().min(1).max(20),
    intake: bags,
    running: bags,
    stock: bags,
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected yyyy-MM-dd");

export const saveInputSchema = z.object({
    cycleId: z.string(),
    visitDate: isoDate,
    age: z.number().int().min(0).max(200),
    todayMortality: z.number().int().min(0).max(200000),
    totalMortality: z.number().int().min(0).max(200000),
    avgWeightG: z.number().int().min(0).max(10000),
    feedLines: z.array(feedLineSchema).max(12),
    litter: z.string().max(2000).default(""),
    disease: z.string().max(2000).default(""),
    medicine: z.string().max(2000).default(""),
    suggestions: z.string().max(4000).default(""),
}).superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (const line of val.feedLines) {
        const key = line.type.toLowerCase();
        if (seen.has(key)) {
            ctx.addIssue({ code: "custom", path: ["feedLines"], message: `Duplicate feed type "${line.type}"` });
        }
        seen.add(key);
    }
});

export const listInputSchema = z.object({
    search: z.string().optional(),
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    sort: z.enum(["date", "farmer"]).default("date"),
    order: z.enum(["asc", "desc"]).default("desc"),
    cursor: z.number().int().min(1).default(1), // page number
    pageSize: z.number().int().min(1).max(50).default(20),
});

export const prefillInputSchema = z.object({ cycleId: z.string(), date: isoDate });
export const idInputSchema = z.object({ id: z.string() });
export const standardInputSchema = z.object({ age: z.number().int().min(0).max(200) });

export type SaveInput = z.infer<typeof saveInputSchema>;
export type ListInput = z.infer<typeof listInputSchema>;
```

Note: `listInputSchema.cursor` is the page number; the tRPC infinite query on mobile passes `cursor` through.

- [ ] **Step 2: Service** (`farmer-visit-service.ts`)

```ts
import { cycleLogs, cycles, farmer, farmerVisitReports, standardValues } from "@/db/schema";
import { updateCycleFeed } from "@/modules/cycles/server/services/feed-service";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { calcAvgFcr, calcLiveBirds, clampStdDay, sumFeed, validateVisitDate } from "../lib/calc";
import type { ListInput, SaveInput } from "./schemas";

// db and tx are both passed as `any` elsewhere in the codebase (see cycle-service.ts).
type Db = any;

// Officers are limited to their own farmers, management sees the whole org.
export type Scope = { orgId: string; officerId?: string };

const scopeFilter = (scope: Scope) =>
    and(
        eq(farmer.organizationId, scope.orgId),
        scope.officerId ? eq(farmer.officerId, scope.officerId) : undefined,
    );

export async function getStandard(db: Db, age: number) {
    const day = clampStdDay(age);
    const [row] = await db.select().from(standardValues).where(eq(standardValues.day, day)).limit(1);
    if (!row) return null;
    return {
        day: row.day,
        dailyFeedG: row.dailyFeedG as number,
        bodyWeightG: row.bodyWeightG as number,
        fcr: row.fcr === null ? null : Number(row.fcr),
    };
}

async function loadActiveCycle(db: Db, scope: Scope, cycleId: string) {
    const [row] = await db
        .select({ cycle: cycles, farmerName: farmer.name, farmerLocation: farmer.location, farmerStatus: farmer.status })
        .from(cycles)
        .innerJoin(farmer, eq(cycles.farmerId, farmer.id))
        .where(and(eq(cycles.id, cycleId), eq(cycles.organizationId, scope.orgId), scopeFilter(scope)))
        .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Cycle not found" });
    return row;
}

export async function getPrefill(db: Db, scope: Scope, input: { cycleId: string; date: string }) {
    const { cycle, farmerName, farmerLocation } = await loadActiveCycle(db, scope, input.cycleId);

    const [existing] = await db
        .select()
        .from(farmerVisitReports)
        .where(and(eq(farmerVisitReports.cycleId, cycle.id), eq(farmerVisitReports.visitDate, input.date)))
        .limit(1);

    return {
        cycle: {
            id: cycle.id,
            name: cycle.name,
            status: cycle.status,
            doc: cycle.doc,
            birdsOut: cycle.birdsOut,
            mortality: cycle.mortality,
            strain: cycle.birdType,
            startDate: (cycle.officialInputDate ?? cycle.createdAt) as Date,
        },
        farmer: { id: cycle.farmerId, name: farmerName, location: farmerLocation },
        existing: existing ?? null,
    };
}

export async function saveReport(
    db: Db,
    scope: Scope,
    user: { id: string; name: string },
    input: SaveInput,
) {
    return await db.transaction(async (tx: Db) => {
        const { cycle, farmerStatus } = await loadActiveCycle(tx, scope, input.cycleId);

        if (cycle.status !== "active") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Reports can only be created for active cycles" });
        }
        if (farmerStatus !== "active") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot create a report for an archived farmer" });
        }

        const cycleStart = (cycle.officialInputDate ?? cycle.createdAt) as Date;
        const dateError = validateVisitDate(input.visitDate, cycleStart, new Date());
        if (dateError) throw new TRPCError({ code: "BAD_REQUEST", message: dateError });

        if (input.totalMortality + cycle.birdsOut > cycle.doc) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Total mortality (${input.totalMortality}) plus birds out (${cycle.birdsOut}) cannot exceed initial birds (${cycle.doc}).`,
            });
        }

        const std = await getStandard(tx, input.age);
        const liveBirds = calcLiveBirds(cycle.doc, input.totalMortality, cycle.birdsOut);
        const avgFcr = calcAvgFcr({
            runningBags: sumFeed(input.feedLines, "running"),
            avgWeightG: input.avgWeightG,
            liveBirds,
        });

        const values = {
            organizationId: scope.orgId,
            farmerId: cycle.farmerId,
            cycleId: cycle.id,
            createdBy: user.id,
            visitDate: input.visitDate,
            cycleName: cycle.name,
            age: input.age,
            docCount: cycle.doc,
            strain: cycle.birdType,
            todayMortality: input.todayMortality,
            totalMortality: input.totalMortality,
            avgWeightG: input.avgWeightG,
            stdWeightG: std?.bodyWeightG ?? null,
            stdFcr: std?.fcr == null ? null : std.fcr.toFixed(3),
            avgFcr: avgFcr.toFixed(3),
            feedLines: input.feedLines,
            litter: input.litter,
            disease: input.disease,
            medicine: input.medicine,
            suggestions: input.suggestions,
            updatedAt: new Date(),
        };

        const [report] = await tx
            .insert(farmerVisitReports)
            .values(values)
            .onConflictDoUpdate({
                target: [farmerVisitReports.cycleId, farmerVisitReports.visitDate],
                set: { ...values, createdBy: sql`${farmerVisitReports.createdBy}` },
            })
            .returning();

        // Sync cycle mortality only when this is the newest report and no birds have left yet
        // (same restriction as correctMortality).
        const [{ latest }] = await tx
            .select({ latest: sql<string>`max(${farmerVisitReports.visitDate})` })
            .from(farmerVisitReports)
            .where(eq(farmerVisitReports.cycleId, cycle.id));

        let mortalitySynced = false;
        if (input.visitDate >= latest && cycle.birdsOut === 0 && input.totalMortality !== cycle.mortality) {
            const [updated] = await tx
                .update(cycles)
                .set({ mortality: input.totalMortality, updatedAt: new Date() })
                .where(eq(cycles.id, cycle.id))
                .returning();

            await updateCycleFeed(
                updated,
                user.id,
                true,
                tx,
                `Mortality set to ${input.totalMortality} from farmer visit report (${input.visitDate}).`,
            );

            await tx.insert(cycleLogs).values({
                cycleId: cycle.id,
                userId: user.id,
                type: "CORRECTION",
                valueChange: input.totalMortality - cycle.mortality,
                previousValue: cycle.mortality,
                newValue: input.totalMortality,
                note: `Farmer visit report ${input.visitDate} by ${user.name}`,
            });
            mortalitySynced = true;
        }

        return { report, mortalitySynced };
    });
}

export async function listReports(db: Db, scope: Scope, input: ListInput) {
    const dir = input.order === "asc" ? asc : desc;
    const orderBy =
        input.sort === "farmer"
            ? [dir(farmer.name), desc(farmerVisitReports.visitDate)]
            : [dir(farmerVisitReports.visitDate), asc(farmer.name)];

    const rows = await db
        .select({ report: farmerVisitReports, farmerName: farmer.name, farmerLocation: farmer.location })
        .from(farmerVisitReports)
        .innerJoin(farmer, eq(farmerVisitReports.farmerId, farmer.id))
        .where(
            and(
                eq(farmerVisitReports.organizationId, scope.orgId),
                scope.officerId ? eq(farmer.officerId, scope.officerId) : undefined,
                input.search ? ilike(farmer.name, `%${input.search}%`) : undefined,
                input.dateFrom ? gte(farmerVisitReports.visitDate, input.dateFrom) : undefined,
                input.dateTo ? lte(farmerVisitReports.visitDate, input.dateTo) : undefined,
            ),
        )
        .orderBy(...orderBy)
        .limit(input.pageSize + 1) // one extra row tells us whether another page exists
        .offset((input.cursor - 1) * input.pageSize);

    const hasMore = rows.length > input.pageSize;
    const items = rows.slice(0, input.pageSize).map((r: any) => ({
        ...r.report,
        farmerName: r.farmerName as string,
        farmerLocation: r.farmerLocation as string | null,
    }));
    return { items, nextCursor: hasMore ? input.cursor + 1 : null };
}

async function findScopedReport(db: Db, scope: Scope, id: string) {
    const [row] = await db
        .select({ report: farmerVisitReports, farmerName: farmer.name, farmerLocation: farmer.location })
        .from(farmerVisitReports)
        .innerJoin(farmer, eq(farmerVisitReports.farmerId, farmer.id))
        .where(and(eq(farmerVisitReports.id, id), eq(farmerVisitReports.organizationId, scope.orgId), scopeFilter(scope)))
        .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    return { ...row.report, farmerName: row.farmerName as string, farmerLocation: row.farmerLocation as string | null };
}

export const getReport = findScopedReport;

// Deleting never rolls the cycle's mortality back; the CORRECTION log entry stays valid.
export async function deleteReport(db: Db, scope: Scope, id: string) {
    await findScopedReport(db, scope, id);
    await db.delete(farmerVisitReports).where(eq(farmerVisitReports.id, id));
    return { success: true };
}
```

- [ ] **Step 3: Officer router** (`trpc/routers/officer/farmer-visits.ts`)

```ts
import {
    deleteReport, getPrefill, getReport, getStandard, listReports, saveReport, type Scope,
} from "@/modules/farmer-visits/server/farmer-visit-service";
import {
    idInputSchema, listInputSchema, prefillInputSchema, saveInputSchema, standardInputSchema,
} from "@/modules/farmer-visits/server/schemas";
import { createTRPCRouter, orgProcedure } from "../../init";

// orgProcedure adds `orgId` to every input and verifies active membership.
const scopeOf = (ctx: { user: { id: string } }, orgId: string): Scope => ({ orgId, officerId: ctx.user.id });

export const officerFarmerVisitsRouter = createTRPCRouter({
    list: orgProcedure
        .input(listInputSchema)
        .query(({ ctx, input }) => listReports(ctx.db, scopeOf(ctx, input.orgId), input)),

    get: orgProcedure
        .input(idInputSchema)
        .query(({ ctx, input }) => getReport(ctx.db, scopeOf(ctx, input.orgId), input.id)),

    getPrefill: orgProcedure
        .input(prefillInputSchema)
        .query(({ ctx, input }) => getPrefill(ctx.db, scopeOf(ctx, input.orgId), input)),

    getStandard: orgProcedure
        .input(standardInputSchema)
        .query(({ ctx, input }) => getStandard(ctx.db, input.age)),

    save: orgProcedure
        .input(saveInputSchema)
        .mutation(({ ctx, input }) =>
            saveReport(ctx.db, scopeOf(ctx, input.orgId), { id: ctx.user.id, name: ctx.user.name }, input)),

    delete: orgProcedure
        .input(idInputSchema)
        .mutation(({ ctx, input }) => deleteReport(ctx.db, scopeOf(ctx, input.orgId), input.id)),
});
```

- [ ] **Step 4: Management router** (`trpc/routers/management/farmer-visits.ts`)

```ts
import { TRPCError } from "@trpc/server";
import {
    deleteReport, getPrefill, getReport, getStandard, listReports, saveReport, type Scope,
} from "@/modules/farmer-visits/server/farmer-visit-service";
import {
    idInputSchema, listInputSchema, prefillInputSchema, saveInputSchema, standardInputSchema,
} from "@/modules/farmer-visits/server/schemas";
import { createTRPCRouter, managementProcedure } from "../../init";

const scopeOf = (orgId: string): Scope => ({ orgId });

// View-only managers can read but not write (same rule as price policies).
const assertCanEdit = (ctx: { user: { globalRole: string | null }; membership?: { accessLevel: string } | null }) => {
    if (ctx.user.globalRole === "ADMIN") return;
    if (ctx.membership?.accessLevel !== "EDIT") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You need edit access to manage farmer visit reports." });
    }
};

export const managementFarmerVisitsRouter = createTRPCRouter({
    list: managementProcedure
        .input(listInputSchema)
        .query(({ ctx, input }) => listReports(ctx.db, scopeOf(input.orgId), input)),

    get: managementProcedure
        .input(idInputSchema)
        .query(({ ctx, input }) => getReport(ctx.db, scopeOf(input.orgId), input.id)),

    getPrefill: managementProcedure
        .input(prefillInputSchema)
        .query(({ ctx, input }) => getPrefill(ctx.db, scopeOf(input.orgId), input)),

    getStandard: managementProcedure
        .input(standardInputSchema)
        .query(({ ctx, input }) => getStandard(ctx.db, input.age)),

    save: managementProcedure
        .input(saveInputSchema)
        .mutation(({ ctx, input }) => {
            assertCanEdit(ctx as any);
            return saveReport(ctx.db, scopeOf(input.orgId), { id: ctx.user.id, name: ctx.user.name }, input);
        }),

    delete: managementProcedure
        .input(idInputSchema)
        .mutation(({ ctx, input }) => {
            assertCanEdit(ctx as any);
            return deleteReport(ctx.db, scopeOf(input.orgId), input.id);
        }),
});
```

- [ ] **Step 5: Register both routers**

In `trpc/routers/officer/officer.ts` add `import { officerFarmerVisitsRouter } from "./farmer-visits";` (keep imports alphabetical, after `./farmers`) and `farmerVisits: officerFarmerVisitsRouter,` inside `createTRPCRouter({ ... })` after `farmers: officerFarmersRouter,`.

In `trpc/routers/management/management.ts` add `import { managementFarmerVisitsRouter } from "./farmer-visits";` and `farmerVisits: managementFarmerVisitsRouter,` after `farmers: managementFarmersRouter,`.

- [ ] **Step 6: Typecheck**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx tsc --noEmit 2>&1 | grep -E "farmer-visit|farmerVisit|db/schema" | head -20
```

Expected: no output (no errors in the new files). The repo has pre-existing errors elsewhere; only new-file errors matter. Fix any that appear (common one: `ctx.membership` typing, which is why `assertCanEdit` takes a loose type and is called with `ctx as any`).

- [ ] **Step 7: Commit**

```bash
git add modules/farmer-visits trpc
git commit -m "feat(farmer-visits): add service and officer/management routers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Re-point reports when a cycle ends or reopens

**Files:**
- Modify: `feed-reminder-up/modules/cycles/server/services/cycle-service.ts` (around line 43, inside `endCycleLogic`)
- Modify: `feed-reminder-up/modules/cycles/server/services/reopen-cycle-service.ts` (around line 40)
- Modify: `feed-reminder-up/trpc/routers/officer/cycles.ts` (around line 895, the second reopen path)

- [ ] **Step 1: End cycle.** In `cycle-service.ts`, add `farmerVisitReports` to the `@/db/schema` import, then directly after the `saleEvents` re-point block (the one ending `.where(eq(saleEvents.cycleId, activeCycle.id));`) add:

```ts
    // LINK FARMER VISIT REPORTS TO HISTORY (otherwise deleting the cycle row cascades them away)
    await tx.update(farmerVisitReports)
        .set({ historyId: history.id, cycleId: null })
        .where(eq(farmerVisitReports.cycleId, activeCycle.id));
```

- [ ] **Step 2: Reopen (service).** In `reopen-cycle-service.ts`, add `farmerVisitReports` to the schema import and after the `saleEvents` migrate block (`.where(eq(saleEvents.historyId, historyId));`) add:

```ts
    // 5. Migrate farmer visit reports: historyId → cycleId
    await tx.update(farmerVisitReports)
        .set({ cycleId: newCycle.id, historyId: null })
        .where(eq(farmerVisitReports.historyId, historyId));
```

Renumber nothing else; just place it after step 4's block.

- [ ] **Step 3: Reopen (router path).** In `trpc/routers/officer/cycles.ts` find the block near line 895 (`.set({ cycleId: restoredCycle.id, historyId: null })`). It re-points `cycleLogs` and probably `saleEvents`. After the last such update in that handler add the same statement using the variable names that handler uses:

```ts
                await tx.update(farmerVisitReports)
                    .set({ cycleId: restoredCycle.id, historyId: null })
                    .where(eq(farmerVisitReports.historyId, <the history id variable used in that handler>));
```

Read the 20 lines above the match to get the exact `tx` and history-id variable names, and add `farmerVisitReports` to this file's `@/db/schema` import.

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx tsc --noEmit 2>&1 | grep -E "cycle-service|reopen-cycle|officer/cycles" | head
```

Expected: no output.

- [ ] **Step 5: Manual DB check** (dev database)

Create a cycle and a visit report, end the cycle, then run:

```bash
npx tsx -e "import 'dotenv/config'; import {db} from './db'; import {sql} from 'drizzle-orm'; db.execute(sql\`select visit_date, cycle_id, history_id from farmer_visit_reports order by created_at desc limit 3\`).then(r=>{console.log(r.rows);process.exit(0)})"
```

Expected after ending: `cycle_id` null, `history_id` set. After reopening: reversed. (This step is done during Task 10 manual QA once the mobile form exists; note the result there.)

- [ ] **Step 6: Commit**

```bash
git add modules/cycles trpc/routers/officer/cycles.ts
git commit -m "feat(farmer-visits): keep reports attached when a cycle ends or reopens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mobile lib (types, calc, message formatter), test first

**Files:**
- Create: `poultry-solution/scripts/verify-farmer-visit.ts`
- Create: `poultry-solution/lib/farmer-visit.ts`

- [ ] **Step 1: Write the failing test** (`scripts/verify-farmer-visit.ts`)

```ts
import assert from "node:assert/strict";
import {
    calcAge,
    calcAvgFcr,
    calcLiveBirds,
    DEFAULT_SUGGESTIONS,
    formatVisitMessage,
    pad2,
    sumFeed,
    type FeedLine,
    type VisitMessageInput,
} from "../lib/farmer-visit";

// pad2: integers under 10 get two digits, everything else is left alone
assert.equal(pad2(0), "00");
assert.equal(pad2(9), "09");
assert.equal(pad2(28), "28");
assert.equal(pad2(2.5), "2.5");

// calcAge: matches the server's rule, max(0, days + 1)
assert.equal(calcAge("2026-10-26", new Date(2026, 9, 7)), 20);
assert.equal(calcAge("2026-10-07", new Date(2026, 9, 7)), 1);
assert.equal(calcAge("2026-10-06", new Date(2026, 9, 7)), 0);

// sum + fcr + live birds mirror the backend helpers
const lines: FeedLine[] = [
    { type: "B1", intake: 15, running: 15, stock: 0 },
    { type: "B2", intake: 13, running: 9, stock: 4 },
];
assert.equal(sumFeed(lines, "intake"), 28);
assert.equal(sumFeed(lines, "running"), 24);
assert.equal(sumFeed(lines, "stock"), 4);
assert.equal(calcLiveBirds(1000, 11, 0), 989);
assert.equal(calcAvgFcr({ runningBags: 24, avgWeightG: 910, liveBirds: 989 }), 1.333);
assert.equal(calcAvgFcr({ runningBags: 24, avgWeightG: 0, liveBirds: 989 }), 0);

// message matches the agreed template exactly
const base: VisitMessageInput = {
    visitDate: "2026-10-26",
    farmerName: "3014 Friends Veterinary",
    farmerLocation: "Laukhi, Shamgonj",
    docCount: 1000,
    strain: "Ross A",
    age: 20,
    todayMortality: 0,
    totalMortality: 11,
    avgWeightG: 910,
    stdWeightG: 865,
    avgFcr: 1.333,
    stdFcr: 1.25,
    feedLines: lines,
    litter: "Dry",
    disease: "",
    medicine: "",
    suggestions: DEFAULT_SUGGESTIONS,
};

const expected = [
    "Date: 26/10/2026",
    "Running farm visit",
    "Farmer: 3014 Friends Veterinary",
    "Location: Laukhi, Shamgonj",
    "",
    "Total DOC input: 1000 pcs",
    "Strain: Ross A",
    "",
    "Age: 20 days",
    "",
    "Today mortality: 0 pcs",
    "Total mortality: 11 pcs",
    "",
    "Avg.wt: 910 gm",
    "Std wt: 865 gm",
    "",
    "Avg.fcr: 1.333",
    "Std.fcr: 1.250",
    "",
    "Feed intake: 28 bags",
    "B1: 15 bags",
    "B2: 13 bags",
    "",
    "Feed: 24 bags running",
    "B1: 15 bags running",
    "B2: 09 bags running",
    "",
    "Farm Stock: 04 bags",
    "B1: 00 bags",
    "B2: 04 bags",
    "",
    "Lit: Dry",
    "",
    "Disease:",
    "",
    "Medicine:",
    "",
    "Suggestions: Maintain curtain management, Feeder and Drinker.",
    "Give fresh water. Maintain temperature.",
].join("\n");
assert.equal(formatVisitMessage(base), expected);

// a third feed type shows up in every section, and a missing std prints a dash
const three = formatVisitMessage({
    ...base,
    stdWeightG: null,
    stdFcr: null,
    feedLines: [...lines, { type: "Starter", intake: 2, running: 1, stock: 0 }],
});
assert.match(three, /Feed intake: 30 bags\nB1: 15 bags\nB2: 13 bags\nStarter: 02 bags/);
assert.match(three, /Feed: 25 bags running[\s\S]*Starter: 01 bags running/);
assert.match(three, /Farm Stock: 04 bags[\s\S]*Starter: 00 bags/);
assert.match(three, /Std wt: - gm/);
assert.match(three, /Std.fcr: -\n/);

console.log("farmer-visit lib: all assertions passed");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /c/Users/amiba/Projects/poultry-solution && npx tsx scripts/verify-farmer-visit.ts
```

Expected: FAIL with `Cannot find module '../lib/farmer-visit'`.

- [ ] **Step 3: Write `lib/farmer-visit.ts`**

```ts
import { differenceInCalendarDays, parseISO } from "date-fns";

export type FeedLine = { type: string; intake: number; running: number; stock: number };

export const KG_PER_BAG = 50;

export const DEFAULT_SUGGESTIONS =
    "Maintain curtain management, Feeder and Drinker.\nGive fresh water. Maintain temperature.";

export const DEFAULT_FEED_LINES: FeedLine[] = [
    { type: "B1", intake: 0, running: 0, stock: 0 },
    { type: "B2", intake: 0, running: 0, stock: 0 },
];

// Bag counts under 10 print with two digits ("09 bags"); decimals are left alone.
export function pad2(n: number): string {
    return Number.isInteger(n) && n >= 0 && n < 10 ? `0${n}` : String(n);
}

// Same rule as the server's updateCycleFeed: floor 0, arrival day counts as day 1.
export function calcAge(visitDate: string, cycleStart: Date): number {
    return Math.max(0, differenceInCalendarDays(parseISO(visitDate), cycleStart) + 1);
}

export function sumFeed(lines: FeedLine[], key: "intake" | "running" | "stock"): number {
    const total = lines.reduce((sum, l) => sum + (Number.isFinite(l[key]) ? l[key] : 0), 0);
    return Math.round(total * 100) / 100;
}

export function calcLiveBirds(doc: number, mortality: number, birdsOut: number): number {
    return Math.max(0, doc - mortality - birdsOut);
}

// Preview only: the server recomputes this on save and its value is the stored one.
export function calcAvgFcr(p: { runningBags: number; avgWeightG: number; liveBirds: number }): number {
    const liveWeightKg = (p.avgWeightG / 1000) * p.liveBirds;
    if (liveWeightKg <= 0) return 0;
    return Math.round(((p.runningBags * KG_PER_BAG) / liveWeightKg) * 1000) / 1000;
}

export type VisitMessageInput = {
    visitDate: string; // yyyy-MM-dd
    farmerName: string;
    farmerLocation: string | null;
    docCount: number;
    strain: string | null;
    age: number;
    todayMortality: number;
    totalMortality: number;
    avgWeightG: number;
    stdWeightG: number | null;
    avgFcr: number;
    stdFcr: number | null;
    feedLines: FeedLine[];
    litter: string;
    disease: string;
    medicine: string;
    suggestions: string;
};

function formatDate(ymd: string): string {
    const [y, m, d] = ymd.split("-");
    return `${d}/${m}/${y}`;
}

function feedSection(
    title: string,
    suffix: string,
    lines: FeedLine[],
    key: "intake" | "running" | "stock",
): string[] {
    return [
        `${title}: ${pad2(sumFeed(lines, key))} bags${suffix}`,
        ...lines.map((l) => `${l.type}: ${pad2(l[key])} bags${suffix}`),
    ];
}

export function formatVisitMessage(v: VisitMessageInput): string {
    const out: string[] = [
        `Date: ${formatDate(v.visitDate)}`,
        "Running farm visit",
        `Farmer: ${v.farmerName}`,
        `Location: ${v.farmerLocation ?? ""}`.trimEnd(),
        "",
        `Total DOC input: ${v.docCount} pcs`,
        `Strain: ${v.strain ?? ""}`.trimEnd(),
        "",
        `Age: ${v.age} days`,
        "",
        `Today mortality: ${v.todayMortality} pcs`,
        `Total mortality: ${v.totalMortality} pcs`,
        "",
        `Avg.wt: ${v.avgWeightG} gm`,
        `Std wt: ${v.stdWeightG ?? "-"} gm`,
        "",
        `Avg.fcr: ${v.avgFcr.toFixed(3)}`,
        `Std.fcr: ${v.stdFcr === null ? "-" : v.stdFcr.toFixed(3)}`,
        "",
        ...feedSection("Feed intake", "", v.feedLines, "intake"),
        "",
        ...feedSection("Feed", " running", v.feedLines, "running"),
        "",
        ...feedSection("Farm Stock", "", v.feedLines, "stock"),
        "",
        `Lit: ${v.litter}`.trimEnd(),
        "",
        `Disease: ${v.disease}`.trimEnd(),
        "",
        `Medicine: ${v.medicine}`.trimEnd(),
        "",
        `Suggestions: ${v.suggestions}`.trimEnd(),
    ];
    return out.join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /c/Users/amiba/Projects/poultry-solution && npx tsx scripts/verify-farmer-visit.ts
```

Expected: `farmer-visit lib: all assertions passed`. If the exact-string assertion fails, diff `expected` against the output and fix the formatter, not the test (the test is the agreed template).

- [ ] **Step 5: Commit**

```bash
git add lib/farmer-visit.ts scripts/verify-farmer-visit.ts
git commit -m "feat(farmer-visits): add shared calc and message formatter

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Mobile API hook and UI building blocks

**Files:**
- Create: `lib/use-farmer-visit-api.ts`
- Create: `components/farmer-visits/date-field.tsx`
- Create: `components/farmer-visits/feed-lines-editor.tsx`

- [ ] **Step 1: API hook** (`lib/use-farmer-visit-api.ts`)

```ts
import { trpc } from "@/lib/trpc";

// Both routers expose the same procedures; management sees the whole org, officers their own farmers.
export function useFarmerVisitApi() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    return {
        orgId: membership?.orgId ?? "",
        isManagement,
        api: isManagement ? trpc.management.farmerVisits : trpc.officer.farmerVisits,
    };
}
```

- [ ] **Step 2: Date field** (`components/farmer-visits/date-field.tsx`)

```tsx
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

interface DateFieldProps {
    label?: string;
    placeholder?: string;
    value: string; // yyyy-MM-dd, or "" when empty
    onChange: (value: string) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    clearable?: boolean;
}

export function DateField({ label, placeholder = "Select date", value, onChange, minimumDate, maximumDate, clearable }: DateFieldProps) {
    const [open, setOpen] = useState(false);
    const current = value ? parseISO(value) : new Date();

    return (
        <View className="flex-1">
            {label ? <Text className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</Text> : null}
            <View className="flex-row items-center h-11 rounded-xl border border-border bg-card px-3 active:bg-muted/50">
                <Pressable className="flex-1 flex-row items-center gap-2 h-full" onPress={() => setOpen(true)}>
                    <Icon as={CalendarDays} size={16} className="text-muted-foreground" />
                    <Text className={value ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}>
                        {value ? format(current, "dd/MM/yyyy") : placeholder}
                    </Text>
                </Pressable>
                {clearable && value ? (
                    <Pressable hitSlop={8} onPress={() => onChange("")}>
                        <Icon as={X} size={16} className="text-muted-foreground" />
                    </Pressable>
                ) : null}
            </View>

            {open && (
                <View>
                    <DateTimePicker
                        value={current}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={minimumDate}
                        maximumDate={maximumDate}
                        onChange={(event, picked) => {
                            if (Platform.OS !== "ios") setOpen(false);
                            if (event.type === "set" && picked) onChange(format(picked, "yyyy-MM-dd"));
                        }}
                    />
                    {Platform.OS === "ios" && (
                        <Pressable className="self-end px-4 py-2 active:opacity-70" onPress={() => setOpen(false)}>
                            <Text className="text-sm font-bold text-primary">Done</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}
```

- [ ] **Step 3: Feed lines editor** (`components/farmer-visits/feed-lines-editor.tsx`)

Holds strings (so users can type "2." mid-entry); the screen converts to numbers on save.

```tsx
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Plus, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

export type FeedLineDraft = { type: string; intake: string; running: string; stock: string };

interface FeedLinesEditorProps {
    lines: FeedLineDraft[];
    onChange: (lines: FeedLineDraft[]) => void;
}

const COLUMNS: { key: "intake" | "running" | "stock"; label: string }[] = [
    { key: "intake", label: "Intake" },
    { key: "running", label: "Running" },
    { key: "stock", label: "Stock" },
];

export function FeedLinesEditor({ lines, onChange }: FeedLinesEditorProps) {
    const update = (index: number, patch: Partial<FeedLineDraft>) =>
        onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

    return (
        <View className="gap-3">
            {lines.map((line, index) => (
                <View key={index} className="rounded-2xl border border-border/50 bg-card p-3 gap-2">
                    <View className="flex-row items-center gap-2">
                        <Input
                            className="flex-1 h-10 font-bold"
                            value={line.type}
                            onChangeText={(t) => update(index, { type: t })}
                            placeholder="Feed type, e.g. B1"
                            maxLength={20}
                            autoCapitalize="characters"
                        />
                        {lines.length > 1 && (
                            <Pressable
                                hitSlop={8}
                                className="w-10 h-10 items-center justify-center rounded-xl active:bg-destructive/10"
                                onPress={() => onChange(lines.filter((_, i) => i !== index))}
                            >
                                <Icon as={Trash2} size={18} className="text-destructive" />
                            </Pressable>
                        )}
                    </View>
                    <View className="flex-row gap-2">
                        {COLUMNS.map((col) => (
                            <View key={col.key} className="flex-1">
                                <Text className="text-[11px] font-semibold text-muted-foreground mb-1">{col.label} (bags)</Text>
                                <Input
                                    className="h-10 text-center"
                                    value={line[col.key]}
                                    onChangeText={(t) => update(index, { [col.key]: t.replace(/[^0-9.]/g, "") })}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                />
                            </View>
                        ))}
                    </View>
                </View>
            ))}

            <Pressable
                className="flex-row items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-primary/50 active:bg-primary/10"
                onPress={() => onChange([...lines, { type: "", intake: "", running: "", stock: "" }])}
                disabled={lines.length >= 12}
            >
                <Icon as={Plus} size={16} className="text-primary" />
                <Text className="text-sm font-bold text-primary">Add feed type</Text>
            </Pressable>
        </View>
    );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/amiba/Projects/poultry-solution && npx tsc --noEmit 2>&1 | grep -E "farmer-visit|farmer-visits" | head
```

Expected: no output. If `trpc.officer.farmerVisits` is reported as missing, the sibling backend path in `lib/trpc.ts` is not resolving the new router: confirm `feed-reminder-up` is on `feat/farmer-visit-reports` and Task 3 is committed there.

- [ ] **Step 5: Commit**

```bash
git add lib/use-farmer-visit-api.ts components/farmer-visits
git commit -m "feat(farmer-visits): add api hook, date field and feed lines editor

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Form screen

**Files:**
- Create: `app/cycle/[id]/farmer-visit.tsx`

Route: `/cycle/<cycleId>/farmer-visit?date=yyyy-MM-dd` (the `date` param is optional and used when editing from the list). The screen has a back button instead of the drawer toggle, so it does not use `ScreenHeader`.

- [ ] **Step 1: Write the screen**

```tsx
import { DateField } from "@/components/farmer-visits/date-field";
import { FeedLineDraft, FeedLinesEditor } from "@/components/farmer-visits/feed-lines-editor";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import {
    calcAge, calcAvgFcr, calcLiveBirds, DEFAULT_SUGGESTIONS, formatVisitMessage, sumFeed, type FeedLine,
} from "@/lib/farmer-visit";
import { useFarmerVisitApi } from "@/lib/use-farmer-visit-api";
import { trpc } from "@/lib/trpc";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format } from "date-fns";
import { ChevronLeft, Copy } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const blankLines = (): FeedLineDraft[] => [
    { type: "B1", intake: "", running: "", stock: "" },
    { type: "B2", intake: "", running: "", stock: "" },
];

const toInt = (s: string) => Math.max(0, Math.trunc(Number(s) || 0));
const toNum = (s: string) => Math.max(0, Number(s) || 0);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View className="gap-1.5">
            <Text className="text-xs font-semibold text-muted-foreground">{label}</Text>
            {children}
        </View>
    );
}

function ReadOnlyStat({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2.5">
            <Text className="text-[11px] font-semibold text-muted-foreground">{label}</Text>
            <Text className="text-base font-black text-foreground">{value}</Text>
        </View>
    );
}

export default function FarmerVisitScreen() {
    const { id: cycleId, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const utils = trpc.useUtils();
    const { orgId, api } = useFarmerVisitApi();

    const [visitDate, setVisitDate] = useState(dateParam ?? format(new Date(), "yyyy-MM-dd"));
    const [age, setAge] = useState("");
    const [todayMortality, setTodayMortality] = useState("");
    const [totalMortality, setTotalMortality] = useState("");
    const [avgWeight, setAvgWeight] = useState("");
    const [lines, setLines] = useState<FeedLineDraft[]>(blankLines());
    const [litter, setLitter] = useState("");
    const [disease, setDisease] = useState("");
    const [medicine, setMedicine] = useState("");
    const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
    const [seededKey, setSeededKey] = useState("");

    const prefill = api.getPrefill.useQuery(
        { orgId, cycleId, date: visitDate },
        { enabled: !!orgId && !!cycleId },
    );
    const cycle = prefill.data?.cycle;
    const farmer = prefill.data?.farmer;
    const existing = prefill.data?.existing ?? null;

    // Seed the form whenever the loaded (cycle, date) changes: from the saved report if one exists
    // for that date, otherwise from cycle defaults.
    useEffect(() => {
        if (!prefill.data) return;
        const key = `${cycleId}:${visitDate}:${existing?.id ?? "new"}`;
        if (key === seededKey) return;
        setSeededKey(key);

        if (existing) {
            setAge(String(existing.age));
            setTodayMortality(String(existing.todayMortality));
            setTotalMortality(String(existing.totalMortality));
            setAvgWeight(String(existing.avgWeightG));
            setLines(
                existing.feedLines.length
                    ? existing.feedLines.map((l) => ({
                          type: l.type, intake: String(l.intake), running: String(l.running), stock: String(l.stock),
                      }))
                    : blankLines(),
            );
            setLitter(existing.litter);
            setDisease(existing.disease);
            setMedicine(existing.medicine);
            setSuggestions(existing.suggestions);
        } else {
            setAge(String(calcAge(visitDate, new Date(prefill.data.cycle.startDate))));
            setTodayMortality("");
            setTotalMortality(String(prefill.data.cycle.mortality));
            setAvgWeight("");
            setLines(blankLines());
            setLitter("");
            setDisease("");
            setMedicine("");
            setSuggestions(DEFAULT_SUGGESTIONS);
        }
    }, [prefill.data, existing, visitDate, cycleId, seededKey]);

    const ageNum = toInt(age);
    const standard = api.getStandard.useQuery(
        { orgId, age: ageNum },
        { enabled: !!orgId && age !== "" },
    );

    const feedLines: FeedLine[] = useMemo(
        () => lines.filter((l) => l.type.trim()).map((l) => ({
            type: l.type.trim(), intake: toNum(l.intake), running: toNum(l.running), stock: toNum(l.stock),
        })),
        [lines],
    );

    const avgFcr = cycle
        ? calcAvgFcr({
              runningBags: sumFeed(feedLines, "running"),
              avgWeightG: toInt(avgWeight),
              liveBirds: calcLiveBirds(cycle.doc, toInt(totalMortality), cycle.birdsOut),
          })
        : 0;

    const stdWeightG = standard.data?.bodyWeightG ?? null;
    const stdFcr = standard.data?.fcr ?? null;

    const save = api.save.useMutation({
        onSuccess: (res) => {
            toast.success(existing ? "Report updated" : "Report saved");
            if (!res.mortalitySynced && cycle && toInt(totalMortality) !== cycle.mortality) {
                toast.message("Cycle mortality was not changed because birds have already been sold.");
            }
            utils.invalidate();
            router.back();
        },
        onError: (e) => toast.error(e.message),
    });

    const buildMessage = () =>
        formatVisitMessage({
            visitDate,
            farmerName: farmer?.name ?? "",
            farmerLocation: farmer?.location ?? null,
            docCount: cycle?.doc ?? 0,
            strain: cycle?.strain ?? null,
            age: ageNum,
            todayMortality: toInt(todayMortality),
            totalMortality: toInt(totalMortality),
            avgWeightG: toInt(avgWeight),
            stdWeightG,
            avgFcr,
            stdFcr,
            feedLines,
            litter,
            disease,
            medicine,
            suggestions,
        });

    const onCopy = async () => {
        await Clipboard.setStringAsync(buildMessage());
        toast.success("Report copied");
    };

    const onSave = () => {
        if (!cycle) return;
        if (feedLines.length === 0) { toast.error("Add at least one feed type"); return; }
        const names = feedLines.map((l) => l.type.toLowerCase());
        if (new Set(names).size !== names.length) { toast.error("Feed type names must be unique"); return; }
        if (toInt(totalMortality) + cycle.birdsOut > cycle.doc) {
            toast.error(`Total mortality cannot exceed initial birds (${cycle.doc})`);
            return;
        }
        save.mutate({
            orgId,
            cycleId,
            visitDate,
            age: ageNum,
            todayMortality: toInt(todayMortality),
            totalMortality: toInt(totalMortality),
            avgWeightG: toInt(avgWeight),
            feedLines,
            litter,
            disease,
            medicine,
            suggestions,
        });
    };

    const header = (
        <View
            className="flex-row items-center px-4 pb-3 bg-background border-b border-border"
            style={{ paddingTop: insets.top + 8 }}
        >
            <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 items-center justify-center rounded-lg active:bg-accent mr-2"
            >
                <Icon as={ChevronLeft} size={22} className="text-foreground" />
            </Pressable>
            <Text className="text-xl font-bold text-[#16a34a] flex-1" numberOfLines={1}>
                {existing ? "Edit Farmer Visit" : "Farmer Visit"}
            </Text>
            <Pressable
                onPress={onCopy}
                disabled={!cycle}
                className="flex-row items-center gap-1.5 h-10 px-3 rounded-xl border border-border active:bg-accent"
            >
                <Icon as={Copy} size={16} className="text-foreground" />
                <Text className="text-sm font-bold text-foreground">Copy</Text>
            </Pressable>
        </View>
    );

    if (prefill.isLoading || !orgId) {
        return (
            <View className="flex-1 bg-background">
                {header}
                <View className="flex-1 items-center justify-center"><BirdyLoader /></View>
            </View>
        );
    }

    if (prefill.isError || !cycle || !farmer) {
        return (
            <View className="flex-1 bg-background">
                {header}
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <Text className="text-center text-muted-foreground">
                        {prefill.error?.message ?? "Could not load this cycle."}
                    </Text>
                    <Button variant="outline" onPress={() => prefill.refetch()}><Text>Try again</Text></Button>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {header}
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Read-only cycle summary */}
                <View className="rounded-2xl border border-border/50 bg-card p-4 gap-1">
                    <Text className="text-lg font-black text-foreground">{farmer.name}</Text>
                    {farmer.location ? <Text className="text-sm text-muted-foreground">{farmer.location}</Text> : null}
                    <Text className="text-sm text-muted-foreground mt-1">
                        {cycle.name} - {cycle.doc} birds{cycle.strain ? ` - ${cycle.strain}` : ""}
                    </Text>
                </View>

                {/* Date and age */}
                <View className="flex-row gap-3">
                    <DateField
                        label="Visit date"
                        value={visitDate}
                        onChange={(v) => v && setVisitDate(v)}
                        minimumDate={new Date(cycle.startDate)}
                        maximumDate={new Date()}
                    />
                    <View className="flex-1">
                        <Field label="Age (days)">
                            <Input className="h-11 rounded-xl" value={age} onChangeText={(t) => setAge(t.replace(/\D/g, ""))} keyboardType="number-pad" />
                        </Field>
                    </View>
                </View>

                {/* Mortality */}
                <View className="gap-3">
                    <Text className="text-base font-bold text-foreground">Mortality</Text>
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Field label="Today (pcs)">
                                <Input className="h-11 rounded-xl" value={todayMortality} onChangeText={(t) => setTodayMortality(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" />
                            </Field>
                        </View>
                        <View className="flex-1">
                            <Field label="Total (pcs)">
                                <Input className="h-11 rounded-xl" value={totalMortality} onChangeText={(t) => setTotalMortality(t.replace(/\D/g, ""))} keyboardType="number-pad" />
                            </Field>
                        </View>
                    </View>
                    <Text className="text-xs text-muted-foreground">
                        Saving sets the cycle's total mortality to this total (currently {cycle.mortality}).
                    </Text>
                </View>

                {/* Weight and FCR */}
                <View className="gap-3">
                    <Text className="text-base font-bold text-foreground">Weight and FCR</Text>
                    <Field label="Avg. weight (gm)">
                        <Input className="h-11 rounded-xl" value={avgWeight} onChangeText={(t) => setAvgWeight(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" />
                    </Field>
                    <View className="flex-row gap-3">
                        <ReadOnlyStat label="Std weight" value={stdWeightG === null ? "-" : `${stdWeightG} gm`} />
                        <ReadOnlyStat label="Std FCR" value={stdFcr === null ? "-" : stdFcr.toFixed(3)} />
                        <ReadOnlyStat label="Avg FCR" value={avgFcr.toFixed(3)} />
                    </View>
                </View>

                {/* Feed */}
                <View className="gap-3">
                    <Text className="text-base font-bold text-foreground">Feed</Text>
                    <FeedLinesEditor lines={lines} onChange={setLines} />
                    <View className="flex-row gap-3">
                        <ReadOnlyStat label="Intake" value={`${sumFeed(feedLines, "intake")} bags`} />
                        <ReadOnlyStat label="Running" value={`${sumFeed(feedLines, "running")} bags`} />
                        <ReadOnlyStat label="Stock" value={`${sumFeed(feedLines, "stock")} bags`} />
                    </View>
                    <Text className="text-xs text-muted-foreground">FCR uses the running bags (50 kg each) as feed consumed.</Text>
                </View>

                {/* Notes */}
                <View className="gap-3">
                    <Text className="text-base font-bold text-foreground">Notes</Text>
                    <Field label="Litter"><Input className="h-11 rounded-xl" value={litter} onChangeText={setLitter} placeholder="Dry" /></Field>
                    <Field label="Disease"><Input className="h-11 rounded-xl" value={disease} onChangeText={setDisease} /></Field>
                    <Field label="Medicine"><Input className="h-11 rounded-xl" value={medicine} onChangeText={setMedicine} /></Field>
                    <Field label="Suggestions">
                        <Input
                            className="rounded-xl min-h-[96px] py-2"
                            value={suggestions}
                            onChangeText={setSuggestions}
                            multiline
                            textAlignVertical="top"
                        />
                    </Field>
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 px-4 pt-3 bg-background border-t border-border"
                style={{ paddingBottom: insets.bottom + 12 }}
            >
                <Button onPress={onSave} disabled={save.isPending} className="h-12 rounded-xl active:scale-[0.98]">
                    <Text className="font-bold">{save.isPending ? "Saving..." : existing ? "Update report" : "Save report"}</Text>
                </Button>
            </View>
        </KeyboardAvoidingView>
    );
}
```

Notes for the implementer: (a) confirm `BirdyLoader` and `Button` import paths match the ones used in `components/cycles/correct-mortality-modal.tsx`; (b) the `toast.message` call exists in `sonner-native`, if not use `toast.info`; (c) `existing.feedLines` is typed `FeedLine[]` via the schema `$type`.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "farmer-visit" | head
```

Expected: no output. Fix any errors in this file.

- [ ] **Step 3: Commit**

```bash
git add "app/cycle/[id]/farmer-visit.tsx"
git commit -m "feat(farmer-visits): add farmer visit form screen

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Entry points from the cycle menus

**Files:**
- Modify: `components/cycles/cycle-card.tsx`
- Modify: `app/cycle/[id].tsx`

The card already owns `useRouter`, so it navigates itself; none of the five `CycleCard` call sites need to change.

- [ ] **Step 1: Card menu.** In `components/cycles/cycle-card.tsx`:

Add `ClipboardList` to the `lucide-react-native` import. Directly after the `Add Mortality` `Pressable` inside the `isActive ? (<> ... </>)` block (line ~241-244) add:

```tsx
                            <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsMenuOpen(false); router.push(`/cycle/${cycle.id}/farmer-visit` as any); }}>
                                <View className="w-8 items-center justify-center mr-3"><Icon as={ClipboardList} size={20} className="text-foreground" /></View>
                                <Text className="text-base font-medium text-foreground">Farmer Visit</Text>
                            </Pressable>
```

- [ ] **Step 2: Cycle detail menu.** In `app/cycle/[id].tsx`, add `ClipboardList` to its `lucide-react-native` import, and directly after the `Add Mortality` `Pressable` (the one with `setIsMortalityModalOpen(true)`, line ~457-462) add:

```tsx
                                <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsMenuOpen(false); router.push(`/cycle/${id}/farmer-visit` as any); }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={ClipboardList} size={20} className="text-foreground" />
                                    </View>
                                    <Text className="font-medium text-foreground text-base flex-1">Farmer Visit</Text>
                                </Pressable>
```

Use the cycle id variable that file already uses for the current cycle (check how `setSelectedActionCycle`/the screen reads the route param; it is `useLocalSearchParams` near the top, name it as the file does).

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "cycle-card|cycle/\[id\]" | head
git add components/cycles/cycle-card.tsx "app/cycle/[id].tsx"
git commit -m "feat(farmer-visits): add Farmer Visit action to cycle menus

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Expected from tsc: no new errors in those files.

---

### Task 9: List screen, card, drawer entry

**Files:**
- Create: `components/farmer-visits/visit-card.tsx`
- Create: `app/(drawer)/farmer-visits.tsx`
- Modify: `app/(drawer)/_layout.tsx`
- Modify: `components/custom-drawer-content.tsx`

- [ ] **Step 1: Card** (`components/farmer-visits/visit-card.tsx`)

```tsx
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatVisitMessage } from "@/lib/farmer-visit";
import * as Clipboard from "expo-clipboard";
import { Copy, Trash2 } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";
import { toast } from "sonner-native";

export type VisitListItem = {
    id: string;
    cycleId: string | null;
    visitDate: string;
    farmerName: string;
    farmerLocation: string | null;
    cycleName: string;
    age: number;
    docCount: number;
    strain: string | null;
    todayMortality: number;
    totalMortality: number;
    avgWeightG: number;
    stdWeightG: number | null;
    avgFcr: string;
    stdFcr: string | null;
    feedLines: { type: string; intake: number; running: number; stock: number }[];
    litter: string;
    disease: string;
    medicine: string;
    suggestions: string;
};

interface VisitCardProps {
    item: VisitListItem;
    onPress: () => void;
    onDelete: () => void;
}

export function VisitCard({ item, onPress, onDelete }: VisitCardProps) {
    const [y, m, d] = item.visitDate.split("-");

    const copy = async () => {
        await Clipboard.setStringAsync(
            formatVisitMessage({
                visitDate: item.visitDate,
                farmerName: item.farmerName,
                farmerLocation: item.farmerLocation,
                docCount: item.docCount,
                strain: item.strain,
                age: item.age,
                todayMortality: item.todayMortality,
                totalMortality: item.totalMortality,
                avgWeightG: item.avgWeightG,
                stdWeightG: item.stdWeightG,
                avgFcr: Number(item.avgFcr),
                stdFcr: item.stdFcr === null ? null : Number(item.stdFcr),
                feedLines: item.feedLines,
                litter: item.litter,
                disease: item.disease,
                medicine: item.medicine,
                suggestions: item.suggestions,
            }),
        );
        toast.success("Report copied");
    };

    const confirmDelete = () =>
        Alert.alert("Delete report", `Delete the ${d}/${m}/${y} visit report for ${item.farmerName}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
        ]);

    return (
        <Pressable
            onPress={onPress}
            disabled={!item.cycleId}
            className="rounded-2xl border border-border/50 bg-card p-4 gap-3 active:bg-muted/50 active:scale-[0.99]"
        >
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                    <Text className="text-base font-black text-foreground" numberOfLines={1}>{item.farmerName}</Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.cycleName}{item.farmerLocation ? `, ${item.farmerLocation}` : ""}
                    </Text>
                </View>
                <View className="bg-primary/10 px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-bold text-primary">{`${d}/${m}/${y}`}</Text>
                </View>
            </View>

            <View className="flex-row gap-2">
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Age</Text>
                    <Text className="text-sm font-black text-foreground">{item.age} d</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Avg wt</Text>
                    <Text className="text-sm font-black text-foreground">{item.avgWeightG} gm</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">FCR</Text>
                    <Text className="text-sm font-black text-foreground">{Number(item.avgFcr).toFixed(3)}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Dead</Text>
                    <Text className="text-sm font-black text-foreground">{item.totalMortality}</Text>
                </View>
            </View>

            <View className="flex-row justify-end gap-2">
                <Pressable className="flex-row items-center gap-1.5 h-9 px-3 rounded-xl border border-border active:bg-accent" onPress={copy}>
                    <Icon as={Copy} size={14} className="text-foreground" />
                    <Text className="text-xs font-bold text-foreground">Copy</Text>
                </Pressable>
                <Pressable className="flex-row items-center gap-1.5 h-9 px-3 rounded-xl border border-destructive/40 active:bg-destructive/10" onPress={confirmDelete}>
                    <Icon as={Trash2} size={14} className="text-destructive" />
                    <Text className="text-xs font-bold text-destructive">Delete</Text>
                </Pressable>
            </View>
        </Pressable>
    );
}
```

- [ ] **Step 2: List screen** (`app/(drawer)/farmer-visits.tsx`)

```tsx
import { DateField } from "@/components/farmer-visits/date-field";
import { VisitCard, type VisitListItem } from "@/components/farmer-visits/visit-card";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFarmerVisitApi } from "@/lib/use-farmer-visit-api";
import { useRouter } from "expo-router";
import { ArrowDown, ArrowUp, ClipboardList, Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { toast } from "sonner-native";

type SortKey = "date" | "farmer";

export default function FarmerVisitsScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const { orgId, api } = useFarmerVisitApi();

    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sort, setSort] = useState<SortKey>("date");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    // Debounce typing so every keystroke does not hit the API.
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim()), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    const query = api.list.useInfiniteQuery(
        {
            orgId,
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            sort,
            order,
        },
        {
            enabled: !!orgId,
            initialCursor: 1,
            getNextPageParam: (last) => last.nextCursor ?? undefined,
        },
    );

    const remove = api.delete.useMutation({
        onSuccess: () => { toast.success("Report deleted"); utils.invalidate(); },
        onError: (e) => toast.error(e.message),
    });

    const items = (query.data?.pages.flatMap((p) => p.items) ?? []) as unknown as VisitListItem[];

    const toggleSort = (key: SortKey) => {
        if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
        else { setSort(key); setOrder(key === "farmer" ? "asc" : "desc"); }
    };

    const SortChip = ({ k, label }: { k: SortKey; label: string }) => {
        const active = sort === k;
        return (
            <Pressable
                onPress={() => toggleSort(k)}
                className={`flex-row items-center gap-1 h-9 px-3 rounded-full border active:opacity-70 ${active ? "bg-primary/10 border-primary/40" : "border-border"}`}
            >
                <Text className={`text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>{label}</Text>
                {active && <Icon as={order === "asc" ? ArrowUp : ArrowDown} size={12} className="text-primary" />}
            </Pressable>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Farmer Visits" />

            <View className="px-4 pt-3 pb-2 gap-3 border-b border-border/50">
                <View className="flex-row items-center h-11 rounded-xl border border-border bg-card px-3 gap-2">
                    <Icon as={Search} size={16} className="text-muted-foreground" />
                    <Input
                        className="flex-1 h-9 border-0 bg-transparent px-0 shadow-none"
                        placeholder="Search farmer name"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
                <View className="flex-row gap-3">
                    <DateField placeholder="From" value={dateFrom} onChange={setDateFrom} maximumDate={new Date()} clearable />
                    <DateField placeholder="To" value={dateTo} onChange={setDateTo} maximumDate={new Date()} clearable />
                </View>
                <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-semibold text-muted-foreground">Sort</Text>
                    <SortChip k="date" label="Date" />
                    <SortChip k="farmer" label="Farmer" />
                </View>
            </View>

            {query.isLoading ? (
                <View className="flex-1 items-center justify-center"><BirdyLoader /></View>
            ) : query.isError ? (
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <Text className="text-center text-muted-foreground">{query.error.message}</Text>
                    <Pressable className="h-10 px-4 rounded-xl border border-border items-center justify-center active:bg-accent" onPress={() => query.refetch()}>
                        <Text className="font-bold text-foreground">Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
                    renderItem={({ item }) => (
                        <VisitCard
                            item={item}
                            onPress={() => router.push(`/cycle/${item.cycleId}/farmer-visit?date=${item.visitDate}` as any)}
                            onDelete={() => remove.mutate({ orgId, id: item.id })}
                        />
                    )}
                    onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
                    onEndReachedThreshold={0.4}
                    refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-8 gap-2">
                            <Icon as={ClipboardList} size={36} className="text-muted-foreground/50" />
                            <Text className="text-base font-bold text-foreground">No visit reports yet</Text>
                            <Text className="text-sm text-muted-foreground text-center">
                                Open a cycle, choose Farmer Visit from its menu, and your reports will appear here.
                            </Text>
                        </View>
                    }
                    ListFooterComponent={query.isFetchingNextPage ? <View className="py-4"><BirdyLoader /></View> : null}
                />
            )}
        </View>
    );
}
```

- [ ] **Step 3: Register the hidden drawer screen.** In `app/(drawer)/_layout.tsx`, add this next to the other hidden screens (e.g. after `price-policies`):

```tsx
        <Drawer.Screen
          name="farmer-visits"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
```

- [ ] **Step 4: Drawer entries.** In `components/custom-drawer-content.tsx`, add `ClipboardCheck` to the `lucide-react-native` import and add the item to both lists (`officerReportItems` and `managementReportItems`), right after the `Monthly Production` entry:

```ts
    { label: "Farmer Visits", icon: ClipboardCheck, route: "/(drawer)/farmer-visits" },
```

(no `isPro` flag; the feature is not Pro-gated).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "farmer-visits|custom-drawer|\(drawer\)/_layout" | head
git add components/farmer-visits app/\(drawer\) components/custom-drawer-content.tsx
git commit -m "feat(farmer-visits): add list screen, card and drawer entry

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Expected from tsc: no new errors. If `useInfiniteQuery` complains that `cursor` is missing from the input, the router's `listInputSchema` `cursor` field is what tRPC passes through; confirm the input object does not also set `cursor` manually.

---

### Task 10: End-to-end verification

- [ ] **Step 1: Re-run both unit scripts**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up && npx tsx scripts/verify-farmer-visit-calc.ts
cd /c/Users/amiba/Projects/poultry-solution && npx tsx scripts/verify-farmer-visit.ts
```

Expected: both print `all assertions passed`.

- [ ] **Step 2: Start backend and app against the dev database**, then walk this checklist (record pass/fail for each):

1. Officer: cycle card menu → Farmer Visit opens the form; date defaults to today; age prefilled; Std weight and Std FCR fill in; changing the date recomputes age and std; editing age refetches std without changing the date.
2. Enter mortality total above the cycle's current value, running bags on B1 and B2, avg weight. Avg FCR preview matches `running × 50 / (avg wt kg × live birds)`.
3. Add a third feed type ("B3"). Totals and the copied message include it. Duplicate names are rejected.
4. Save. Cycle screen shows the new mortality; the cycle logs timeline shows a "Farmer visit report ..." correction entry.
5. Reopen the same cycle's Farmer Visit on the same date: the form loads the saved report (edit mode, "Update report").
6. Save a second report with an earlier date and a different total mortality: report saves but the cycle mortality does not change (not the latest).
7. Copy from the form and from a list card: paste into a text editor and compare with the template (zero-padded bags, trailing sections present).
8. List: search by farmer name, date range, sort by date and farmer (both directions), pull to refresh, infinite scroll (create more than 20 or temporarily set `pageSize: 2`), empty state with a fresh filter.
9. Delete a report: confirm prompt, row disappears, cycle mortality unchanged.
10. Sell some birds in a cycle, then save a visit report: it saves, a toast says cycle mortality was not changed.
11. End a cycle that has reports, run the SQL check from Task 4 Step 5 (`cycle_id` null, `history_id` set), then reopen it and confirm the reverse. The list still shows the ended cycle's reports (tapping a card is disabled, Copy and Delete work).
12. Management mode: list shows reports from all officers; a view-only manager gets the "need edit access" error on save; an editor can save.
13. Dark mode and light mode: form, list, date picker and cards are readable.

- [ ] **Step 3: Fix anything that failed**, re-run Step 1, and commit fixes with `fix(farmer-visits): ...` messages.

- [ ] **Step 4: Hand off.** Push both branches and open one PR per repo (backend first, since mobile types depend on it). Do not merge before the production migration and `seed-standard-values.ts` run are scheduled; list both as required deploy steps in the backend PR description.

---

## Self-review notes

- **Spec coverage:** standard table and extrapolation (Tasks 0, 1, 2); report table with dynamic `feed_lines`, unique per cycle+date (Task 2); FCR from running bags (Tasks 1, 3, 5); mortality set-to-total with log and latest-only rule (Task 3); edit/delete (Tasks 3, 7, 9); search/filter/sort list (Tasks 3, 9); drawer entry for both modes and cycle menu action (Tasks 8, 9); copy text in form and list (Tasks 5, 7, 9); suggestions prefill (Tasks 5, 7); editable age and std refetch on date or age change (Task 7); date bounds (Tasks 1, 3, 7). Gaps handled as deviations at the top (end/reopen, sold-cycle mortality, client-side age).
- **Type consistency:** `FeedLine { type, intake, running, stock }` is the same in backend `calc.ts`, schema `$type`, zod `feedLineSchema`, and mobile `lib/farmer-visit.ts`. Router procedure names (`list`, `get`, `getPrefill`, `getStandard`, `save`, `delete`) match between both routers and the mobile screens. `cursor` is the page number end to end.
- **Known soft spots to watch during execution:** the second reopen path in `officer/cycles.ts` (variable names must be read from the file), `ctx.membership` typing in the management router, and `sonner-native`'s `toast.message` availability.
