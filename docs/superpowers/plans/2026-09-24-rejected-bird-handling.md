# Rejected Bird Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rejected birds a first-class figure — stored per cycle, correct in the Production Report, and never folded into a number labelled "sold".

**Architecture:** `sale_events.birds_rejected` stays the only source of truth. `cycles` and `cycle_history` gain a `birds_rejected` column backfilled from it, and their misleading `birds_sold` column is renamed to `birds_out` (it has always meant sold + rejected). `sale_metrics` gains `total_birds_rejected`, and `SaleMetricsService` stops reading rejects from the latest sale alone. A read-only invariant script proves the damage before the fix and the repair after. Released mobile clients keep working through a deprecated `birdsSold` alias in API responses.

**Tech Stack:** Next.js + tRPC + Drizzle ORM on Neon Postgres (`feed-reminder-up`, GitHub `new-hope`); Expo React Native (`poultry-solution`). Scripts run with `tsx`. No test framework exists in either repo and this plan does not add one — verification is the invariant script plus `tsc`.

**Spec:** `docs/superpowers/specs/2026-09-24-rejected-bird-handling-design.md`

**Repo paths:**
- Backend + web: `C:\Users\amiba\Projects\feed-reminder-up`
- Mobile: `C:\Users\amiba\Projects\poultry-solution`

**Before starting:** backups `backup_13_2026-09-24.sql` (dev, `ep-nameless-heart`) and `backup_14_2026-09-24.sql` (production, `ep-dark-shape`) already exist in `feed-reminder-up/database_backup/`. If more than a day has passed, take fresh ones with `npm run db:backup` before Task 4.

**Database switching:** `.env` holds both URLs, one commented out. Line 2 is production (`ep-dark-shape`), line 5 is dev (`ep-nameless-heart`). Swap which is commented to point the tooling at the other database. Every task below states which database it targets.

---

### Task 1: Invariant script that proves the bug

This is the failing test. It is read-only, works before any schema change, and must report mismatches on the current database.

**Files:**
- Create: `feed-reminder-up/scripts/verify-bird-math.ts`
- Modify: `feed-reminder-up/package.json` (scripts block)

- [ ] **Step 1: Write the script**

```ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

type Row = {
    label: string;
    farmer_name: string | null;
    doc: number;
    mortality: number;
    rejected: string | number;
    stored_survival: string | number;
};

async function main() {
    const result: any = await db.execute(sql`
        WITH rejected AS (
            SELECT
                e.cycle_id,
                e.history_id,
                SUM(COALESCE(r.birds_rejected, e.birds_rejected)) AS rejected
            FROM sale_events e
            LEFT JOIN sale_reports r ON r.id = e.selected_report_id
            GROUP BY e.cycle_id, e.history_id
        )
        SELECT
            COALESCE(c.name, h.cycle_name) AS label,
            f.name AS farmer_name,
            COALESCE(c.doc, h.doc) AS doc,
            COALESCE(c.mortality, h.mortality) AS mortality,
            COALESCE(rj.rejected, 0) AS rejected,
            m.survival_rate AS stored_survival
        FROM sale_metrics m
        LEFT JOIN cycles c ON c.id = m.cycle_id
        LEFT JOIN cycle_history h ON h.id = m.history_id
        LEFT JOIN farmer f ON f.id = COALESCE(c.farmer_id, h.farmer_id)
        LEFT JOIN rejected rj
               ON (m.cycle_id IS NOT NULL AND rj.cycle_id = m.cycle_id)
               OR (m.history_id IS NOT NULL AND rj.history_id = m.history_id)
    `);

    const rows: Row[] = Array.isArray(result) ? result : result.rows;

    let checked = 0;
    let failed = 0;

    for (const row of rows) {
        const doc = Number(row.doc) || 0;
        if (doc <= 0) continue;

        const mortality = Number(row.mortality) || 0;
        const rejected = Number(row.rejected) || 0;
        const expected = ((doc - mortality - rejected) / doc) * 100;
        const stored = Number(row.stored_survival) || 0;

        checked++;

        if (Math.abs(expected - stored) > 0.01) {
            failed++;
            console.log(
                `MISMATCH  ${row.farmer_name ?? "?"} / ${row.label ?? "?"}  ` +
                `doc=${doc} mortality=${mortality} rejected=${rejected}  ` +
                `stored=${stored.toFixed(2)}%  expected=${expected.toFixed(2)}%  ` +
                `delta=${(stored - expected).toFixed(2)}`
            );
        }
    }

    console.log(`\nsurvival rate: ${checked - failed}/${checked} correct, ${failed} wrong`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
```

- [ ] **Step 2: Register the script**

In `feed-reminder-up/package.json`, add to `"scripts"` after `"db:restore"`:

```json
"verify:birds": "tsx scripts/verify-bird-math.ts"
```

- [ ] **Step 3: Run it against dev, expect failures**

Confirm `.env` line 5 (`ep-nameless-heart`) is the uncommented one, then:

Run: `npm run verify:birds`
Expected: exit code 1, one `MISMATCH` line per cycle that has rejects in a non-final sale, ending with e.g. `survival rate: 40/43 correct, 3 wrong`. Zero mismatches on dev means dev has no affected cycles — continue anyway, production is the database that matters.

- [ ] **Step 4: Record the production picture**

Comment line 5 and uncomment line 2 in `.env` so production is active, then:

Run: `npm run verify:birds > database_backup/verify-before-prod.txt 2>&1; echo "exit=$?"`
Expected: a non-zero exit and a file listing every affected cycle. Keep that file — it is the before/after evidence.

Restore `.env` to dev (uncomment line 5, comment line 2) before continuing.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up
git checkout -b feat/rejected-bird-columns main
git add scripts/verify-bird-math.ts package.json
git commit -m "chore(scripts): add read-only bird math invariant check"
```

---

### Task 2: Schema change

**Files:**
- Modify: `feed-reminder-up/db/schema.ts:226` (cycles), `:251` (cycleHistory), `:394-430` (saleMetrics)

- [ ] **Step 1: Rename and add on `cycles`**

At `db/schema.ts:226`, replace:

```ts
  birdsSold: integer("birds_sold").notNull().default(0),
```

with:

```ts
  // Every bird that left the house: sold AND rejected. Sold alone is birdsOut - birdsRejected.
  birdsOut: integer("birds_out").notNull().default(0),
  birdsRejected: integer("birds_rejected").notNull().default(0),
```

- [ ] **Step 2: Same on `cycleHistory`**

At `db/schema.ts:251`, replace:

```ts
  birdsSold: integer("birds_sold").notNull().default(0),
```

with:

```ts
  // Every bird that left the house: sold AND rejected.
  birdsOut: integer("birds_out").notNull().default(0),
  birdsRejected: integer("birds_rejected").notNull().default(0),
```

- [ ] **Step 3: Add the metrics column**

In the `saleMetrics` table, after `totalBirdsSold: integer("total_birds_sold").notNull(),` add:

```ts
  totalBirdsRejected: integer("total_birds_rejected").notNull().default(0),
```

- [ ] **Step 4: Confirm it does not compile yet**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors on every file that reads `.birdsSold` off a cycle or history row — roughly 45 across `trpc/` and `modules/`. That list is the work for Task 5. Do not fix them yet.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts
git commit -m "feat(db): rename cycle birds_sold to birds_out, add birds_rejected"
```

---

### Task 3: Write the migration DDL by hand

**These databases are managed by `drizzle-kit push`, not by migrations.** The `drizzle/`
folder holds ten migration files, but `drizzle.__drizzle_migrations` is EMPTY — verified on
dev. Running `drizzle-kit migrate` would treat all ten as unapplied and replay them against
a database that already has those tables.

**Never run `drizzle-kit migrate` or `drizzle-kit generate` on this project.**

`drizzle-kit push` would work, but on a rename it stops and asks whether `birds_out` is a new
column or a rename of `birds_sold`. Answering wrong drops the column and every cycle's bird
count with it, and the prompt cannot be answered from a non-interactive shell. So the DDL is
written by hand, and `push` is used afterwards only as a read-only confirmation.

**Files:**
- Create: `feed-reminder-up/scripts/migrate-rejected-birds.ts`

> **Implemented as committed:** `scripts/migrate-rejected-birds.ts` (commit `c17f7d3`) uses
> `db.transaction()` with one `tx.execute()` per statement, NOT the single multi-statement
> string sketched below. Reason, documented in the file's header: a multi-statement
> `db.execute` only works here because zero interpolations leave `params` empty, which routes
> through Postgres's simple-query protocol; adding any `${...}` would switch it to the
> extended protocol, which rejects multi-statement strings. The transaction form does not
> depend on that. The SQL statements themselves are exactly as below.

- [ ] **Step 1: Write the migration script**

```ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

async function main() {
    const before: any = await db.execute(sql`
        SELECT COUNT(*) FILTER (WHERE birds_sold > 0) AS with_sales, COUNT(*) AS total FROM cycles
    `);
    const beforeRows = Array.isArray(before) ? before : before.rows;
    console.log("before:", JSON.stringify(beforeRows));

    await db.execute(sql`
        BEGIN;

        ALTER TABLE "cycles" RENAME COLUMN "birds_sold" TO "birds_out";
        ALTER TABLE "cycle_history" RENAME COLUMN "birds_sold" TO "birds_out";

        ALTER TABLE "cycles" ADD COLUMN "birds_rejected" integer DEFAULT 0 NOT NULL;
        ALTER TABLE "cycle_history" ADD COLUMN "birds_rejected" integer DEFAULT 0 NOT NULL;
        ALTER TABLE "sale_metrics" ADD COLUMN "total_birds_rejected" integer DEFAULT 0 NOT NULL;

        UPDATE "cycles" SET "birds_rejected" = COALESCE((
            SELECT SUM(COALESCE(r."birds_rejected", e."birds_rejected"))
            FROM "sale_events" e
            LEFT JOIN "sale_reports" r ON r."id" = e."selected_report_id"
            WHERE e."cycle_id" = "cycles"."id"
        ), 0);

        UPDATE "cycle_history" SET "birds_rejected" = COALESCE((
            SELECT SUM(COALESCE(r."birds_rejected", e."birds_rejected"))
            FROM "sale_events" e
            LEFT JOIN "sale_reports" r ON r."id" = e."selected_report_id"
            WHERE e."history_id" = "cycle_history"."id"
        ), 0);

        COMMIT;
    `);

    const after: any = await db.execute(sql`
        SELECT COUNT(*) FILTER (WHERE birds_out > 0) AS with_sales,
               COUNT(*) FILTER (WHERE birds_rejected > 0) AS with_rejects,
               COUNT(*) AS total
        FROM cycles
    `);
    console.log("after:", JSON.stringify(Array.isArray(after) ? after : after.rows));
    process.exit(0);
}

main().catch((e) => {
    console.error("MIGRATION FAILED:", e.message);
    process.exit(1);
});
```

The whole thing runs inside one `BEGIN`/`COMMIT`, so a failure on any statement rolls back
every earlier one. The script is NOT idempotent — running it twice fails on the second
`RENAME`, which is the desired behaviour.

- [ ] **Step 2: Register it**

In `package.json` scripts, after `"backfill:metrics"`:

```json
"migrate:rejected-birds": "tsx scripts/migrate-rejected-birds.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-rejected-birds.ts package.json
git commit -m "chore(scripts): hand-written DDL for the birds_out rename"
```

---

### Task 4: Apply to dev

**Targets the dev database** (`.env` line 5 uncommented, line 2 commented).

- [ ] **Step 1: Fresh backup**

Run: `npm run db:backup`
Expected: `✅ Backup completed successfully: backup_N_<date>.sql`. Note the filename.

- [ ] **Step 2: Apply**

Run: `npm run migrate:rejected-birds`
Expected:
```
before: [{"with_sales":<n>,"total":<m>}]
after:  [{"with_sales":<n>,"with_rejects":<k>,"total":<m>}]
```
`with_sales` and `total` must be IDENTICAL before and after. If `with_sales` drops to 0, the
rename became a drop — restore from the Step 1 backup with `npm run db:restore` immediately.

- [ ] **Step 3: Confirm the backfill landed**

Run:
```bash
npx tsx -e "import 'dotenv/config';import {sql} from 'drizzle-orm';import {db} from './db';db.execute(sql\`SELECT name, doc, birds_out, birds_rejected, mortality FROM cycles WHERE birds_rejected > 0 ORDER BY updated_at DESC LIMIT 5\`).then((r:any)=>{console.log(Array.isArray(r)?r:r.rows);process.exit(0)})"
```
Expected: rows whose `birds_rejected` matches the rejects recorded against those cycles' sales,
and whose `birds_out` still holds what `birds_sold` held.

- [ ] **Step 4: Confirm the live columns match the schema**

Do NOT use `drizzle-kit push` to verify. Push is the command that prompts destructively on a
rename; using it as a check invites the accident this whole task exists to avoid. Read
`information_schema` instead:

```bash
npx tsx -e "import 'dotenv/config';import {sql} from 'drizzle-orm';import {db} from './db';db.execute(sql\`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE (table_name IN ('cycles','cycle_history') AND column_name IN ('birds_out','birds_rejected','birds_sold')) OR (table_name = 'sale_metrics' AND column_name = 'total_birds_rejected') ORDER BY table_name, column_name\`).then((r:any)=>{for(const x of (Array.isArray(r)?r:r.rows))console.log(JSON.stringify(x));process.exit(0)})"
```

Expected: five rows — `birds_out` and `birds_rejected` on both `cycles` and `cycle_history`,
plus `total_birds_rejected` on `sale_metrics`, all `integer`, `is_nullable: NO`, default `0`.
**No row may name `birds_sold`** on either table; if one does, the rename did not happen.

- [ ] **Step 5: Confirm the backfill agrees with the sale events**

```bash
npx tsx -e "import 'dotenv/config';import {sql} from 'drizzle-orm';import {db} from './db';db.execute(sql\`SELECT COUNT(*) AS disagreements FROM cycle_history h WHERE h.birds_rejected <> COALESCE((SELECT SUM(COALESCE(r.birds_rejected, e.birds_rejected)) FROM sale_events e LEFT JOIN sale_reports r ON r.id = e.selected_report_id WHERE e.history_id = h.id), 0)\`).then((r:any)=>{console.log(Array.isArray(r)?r:r.rows);process.exit(0)})"
```

Expected: `disagreements: 0`.

### Task 5: Fix the backend call sites

Work from the `tsc` error list produced in Task 2 Step 4. Every cycle-level `.birdsSold` becomes `.birdsOut`. Per-sale `birdsSold` on `saleEvents` / `saleReports` is a different, correct field — leave it alone.

**Files:**
- Modify: `feed-reminder-up/trpc/routers/officer/sales.ts:301`, `:314`, `:468`, `:523`, `:862`, `:934`, `:1962`, `:2011`
- Modify: `feed-reminder-up/trpc/routers/officer/cycles.ts:99`, `:160`, `:618`, `:860`, `:1263`, `:1363`, `:1593`
- Modify: `feed-reminder-up/trpc/routers/officer/officer.ts:83`, `:89`
- Modify: `feed-reminder-up/trpc/routers/management/cycles.ts:101`, `:254`, `:333`
- Modify: `feed-reminder-up/trpc/routers/management/analytics.ts:90`, `:96`
- Modify: `feed-reminder-up/trpc/routers/admin/cycles.ts:90`, `:216`, `:279`
- Modify: `feed-reminder-up/trpc/routers/ai.ts:841`
- Modify: `feed-reminder-up/modules/cycles/server/services/cycle-service.ts:30`

- [ ] **Step 1: Rename the guards and the arithmetic**

Examples of the exact shape — apply the same substitution everywhere `tsc` points:

`trpc/routers/officer/sales.ts:301`
```ts
const currentRemaining = lockedCycle.doc - lockedCycle.mortality - lockedCycle.birdsOut;
```

`trpc/routers/officer/sales.ts:314`
```ts
const totalAccounted = (lockedCycle.birdsOut + input.birdsSold + (input.birdsRejected || 0)) + (lockedCycle.mortality + input.mortalityChange);
```

`trpc/routers/officer/sales.ts:468` — note the local variable is renamed too, and its use in the `cycles` update and the `cycleLogs` entry below it:
```ts
const newBirdsOut = cycle.birdsOut + input.birdsSold + (input.birdsRejected || 0);
```
then in the update at `:470`:
```ts
birdsOut: newBirdsOut,
```
and in the log at `:522-523`:
```ts
newValue: newBirdsOut,
previousValue: cycle.birdsOut,
```

`trpc/routers/officer/sales.ts:862` and `:934`:
```ts
const newBirdsOut = activeCycle.birdsOut + birdsSoldDifference;   // :862
const newBirdsOut = historyRecord.birdsOut + birdsSoldDifference; // :934
```
Both feed a `newMortality + newBirdsOut > doc` guard and a `birdsOut: newBirdsOut` update — rename those uses as well.

`trpc/routers/officer/sales.ts:1962` and `:2011`:
```ts
birdsOut: sql`${cycles.birdsOut} + ${birdsSoldDiff}`,
birdsOut: sql`${cycleHistory.birdsOut} + ${birdsSoldDiff}`,
```

`trpc/routers/officer/cycles.ts:860` (cycle reopen):
```ts
birdsOut: 0, // RESET birds that left the house
birdsRejected: 0,
```

`trpc/routers/officer/cycles.ts:1263`, `:1363`, `:1593` (edit-DOC / edit-age / correct-mortality guards):
```ts
if (cycle.birdsOut > 0) {
```

`trpc/routers/officer/officer.ts:89`, `management/analytics.ts:96`, `ai.ts:841` (live-bird SQL):
```ts
sql`${cycles.doc} - ${cycles.mortality} - COALESCE(${cycles.birdsOut}, 0) > 0`
```

- [ ] **Step 2: Carry rejects into history**

`modules/cycles/server/services/cycle-service.ts:30`, in the `cycleHistory` insert:

```ts
        birdsOut: activeCycle.birdsOut, // Note: caller must ensure this is up to date if modifying before call
        birdsRejected: activeCycle.birdsRejected,
```

- [ ] **Step 3: Keep released mobile apps alive**

In the four list endpoints that ship cycle rows to the phone, emit both. `trpc/routers/officer/cycles.ts:99`:

```ts
                    birdsOut: d.cycle.birdsOut,
                    birdsRejected: d.cycle.birdsRejected,
                    /** @deprecated Means birdsOut (sold + rejected). Kept for app versions <= 1.0.59. */
                    birdsSold: d.cycle.birdsOut,
```

`trpc/routers/officer/cycles.ts:160` — same three lines with `d.history`. `trpc/routers/management/cycles.ts:101`, `:254`, `:333` and `trpc/routers/admin/cycles.ts:90`, `:216`, `:279` — same, matching each site's source object (`d.cycle`, `historyRecord`, or `d.history`).

Also the two cycle-detail endpoints from the spec, `officer/cycles.ts` `type: 'active'` and `type: 'history'` return blocks (near `totalBirdsRejected: Number(rejectedResult[0]?.total) || 0`), get the same deprecated alias in their `data` object:

```ts
                        /** @deprecated Means birdsOut (sold + rejected). Kept for app versions <= 1.0.59. */
                        birdsSold: activeCycle.birdsOut,
```

- [ ] **Step 4: Compile clean**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `birdsSold` or `birdsOut`.

- [ ] **Step 5: Commit**

```bash
git add trpc/ modules/cycles/server/services/cycle-service.ts
git commit -m "refactor(cycles): read birdsOut, keep deprecated birdsSold alias for old apps"
```

---

### Task 5b: Keep `birdsRejected` maintained, close the alias gaps

Added during execution. Task 5's review found that `cycles.birdsRejected` was written only as
a reset to 0 — the migration backfills it once and then it goes stale the first time anyone
records a sale with rejects. The spec specified the backfill but never the ongoing
maintenance. Implemented in commits `040e566` and `a74253e`.

**Part 1 — maintain the counter** (`trpc/routers/officer/sales.ts`). Wherever `birdsOut`
changes, `birdsRejected` changes by the rejected component of the same delta:

- Sale creation: `cycle.birdsRejected + (input.birdsRejected || 0)`.
- Adjustment, both the `cycles` and `cycleHistory` branches:
  `Math.max(0, X.birdsRejected + ((input.birdsRejected || 0) - previousBirdsRejected))`.
- Version switch: `sql\`GREATEST(${cycles.birdsRejected} + ${birdsRejectedDiff}, 0)\`` where
  `birdsRejectedDiff = (report.birdsRejected || 0) - (event.birdsRejected || 0)`.
- Revert-all-sales and cycle reopen already zero both counters — verified, unchanged.

The invariant each path must preserve: `cycles.birdsRejected` equals
`SUM(COALESCE(sale_reports.birds_rejected, sale_events.birds_rejected))` over the cycle's
events via `selected_report_id`.

**Part 2 — alias gaps.** The deprecated `birdsSold` alias reached each endpoint's main `data`
object but not the `combinedHistory` arrays in the three `cycles.ts` routers' detail
endpoints, nor `management/farmers.ts` `getManagementHub`. Both spread raw DB rows and feed
`MobileCycleCard`, which reads `cycle.birdsSold` and would have got `undefined → 0`. Alias
added to all ten mapped objects. No UI component was touched.

---

### Task 6: Fix the stored metrics

**Files:**
- Modify: `feed-reminder-up/modules/reports/server/services/sale-metrics-service.ts:195-197`, `:231`, `:252`

- [ ] **Step 1: Sum rejects across every sale**

Replace lines 195-197:

```ts
        // Get rejected birds from the latest sale (matches how totalMortality is sourced)
        const latestSaleData = latestSale?.selectedReport || latestSale;
        const totalBirdsRejected = Number(latestSaleData?.birdsRejected) || 0;
```

with:

```ts
        // Rejected birds are recorded per sale, so the cycle total is the sum across every
        // sale's selected version — never the latest sale's value alone.
        const totalBirdsRejected = sales.reduce(
            (sum, s) => sum + (Number((s.selectedReport ?? s).birdsRejected) || 0),
            0
        );
```

`survivalRate`, the `survivors` denominator behind `averageWeight`, and `epi` all read this variable already, so they correct together with no further edits.

- [ ] **Step 2: Persist it**

In the `insert(saleMetrics).values({...})` block, after `totalBirdsSold,` add:

```ts
            totalBirdsRejected,
```

and in the `onConflictDoUpdate` `set: {...}` block, after `totalBirdsSold,` add the same line:

```ts
                totalBirdsRejected,
```

- [ ] **Step 3: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add modules/reports/server/services/sale-metrics-service.ts
git commit -m "fix(metrics): count rejected birds from every sale, store the total"
```

---

### Task 7: Backfill script

**Files:**
- Create: `feed-reminder-up/scripts/backfill-metrics.ts`
- Modify: `feed-reminder-up/package.json`

- [ ] **Step 1: Write it**

```ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { SaleMetricsService } from "../modules/reports/server/services/sale-metrics-service";

async function main() {
    const result: any = await db.execute(sql`
        SELECT id, NULL::text AS history_id FROM cycles
        UNION ALL
        SELECT NULL::text AS id, id AS history_id FROM cycle_history
    `);
    const rows: { id: string | null; history_id: string | null }[] =
        Array.isArray(result) ? result : result.rows;

    console.log(`recalculating ${rows.length} cycles/histories...`);

    let done = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            await SaleMetricsService.recalculateForCycle(
                row.id ?? undefined,
                row.history_id ?? undefined
            );
            done++;
        } catch (e: any) {
            // A cycle with no sales has no metrics row; that is not a failure.
            if (String(e?.message || "").includes("no sales")) {
                skipped++;
            } else {
                failed++;
                console.error(`FAILED ${row.id ?? row.history_id}: ${e?.message}`);
            }
        }
        if ((done + skipped + failed) % 25 === 0) {
            console.log(`  ${done + skipped + failed}/${rows.length}`);
        }
    }

    console.log(`\ndone=${done} skipped=${skipped} failed=${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
```

- [ ] **Step 2: Register it**

In `package.json` scripts, after `"verify:birds"`:

```json
"backfill:metrics": "tsx scripts/backfill-metrics.ts"
```

- [ ] **Step 3: Check the service signature matches the call**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. If `recalculateForCycle` rejects two positional arguments, open `modules/reports/server/services/sale-metrics-service.ts` and match the real signature — the first two parameters are `cycleId` and `historyId`, both optional.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-metrics.ts package.json
git commit -m "chore(scripts): add one-off metrics recalculation backfill"
```

---

### Task 8: Extend the verifier, run the dev cycle

**Files:**
- Modify: `feed-reminder-up/scripts/verify-bird-math.ts`

- [ ] **Step 1: Add the two column invariants**

Inside `main()`, before the final `console.log`, add:

```ts
    const colResult: any = await db.execute(sql`
        WITH rejected AS (
            SELECT
                e.cycle_id,
                SUM(COALESCE(r.birds_rejected, e.birds_rejected)) AS rejected
            FROM sale_events e
            LEFT JOIN sale_reports r ON r.id = e.selected_report_id
            WHERE e.cycle_id IS NOT NULL
            GROUP BY e.cycle_id
        )
        SELECT c.name, f.name AS farmer_name, c.doc, c.mortality,
               c.birds_out, c.birds_rejected, COALESCE(rj.rejected, 0) AS expected_rejected
        FROM cycles c
        LEFT JOIN farmer f ON f.id = c.farmer_id
        LEFT JOIN rejected rj ON rj.cycle_id = c.id
    `);
    const colRows: any[] = Array.isArray(colResult) ? colResult : colResult.rows;

    let colFailed = 0;
    for (const c of colRows) {
        const stored = Number(c.birds_rejected) || 0;
        const expected = Number(c.expected_rejected) || 0;
        const remaining = (Number(c.doc) || 0) - (Number(c.mortality) || 0) - (Number(c.birds_out) || 0);

        if (stored !== expected) {
            colFailed++;
            console.log(`REJECTED MISMATCH  ${c.farmer_name ?? "?"} / ${c.name}  stored=${stored} expected=${expected}`);
        }
        if (remaining < 0) {
            colFailed++;
            console.log(`NEGATIVE REMAINING ${c.farmer_name ?? "?"} / ${c.name}  doc=${c.doc} mortality=${c.mortality} out=${c.birds_out}`);
        }
    }
    console.log(`cycle columns: ${colRows.length - colFailed}/${colRows.length} correct, ${colFailed} wrong`);
    failed += colFailed;
```

`failed` is already declared with `let` in Task 1, so `failed += colFailed;` needs no other change.

- [ ] **Step 2: Run against dev before the backfill**

Run: `npm run verify:birds`
Expected: `cycle columns` all correct (the migration backfilled them); `survival rate` still reporting any mismatches, because the stored metrics have not been recomputed yet.

- [ ] **Step 3: Backfill dev**

Run: `npm run backfill:metrics`
Expected: `done=<n> skipped=<m> failed=0`

- [ ] **Step 4: Verify dev is clean**

Run: `npm run verify:birds`
Expected: exit 0, `0 wrong` on both checks.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-bird-math.ts
git commit -m "chore(scripts): verify cycle rejected columns and non-negative remaining"
```

---

### Task 9: Web display — cycle lists

**Files:**
- Modify: `feed-reminder-up/modules/admin/components/org-cycles-list.tsx:216`, `:229-230`, `:321`
- Modify: `feed-reminder-up/modules/cycles/ui/components/shared/columns-factory.tsx:97-98`, `:113-114`, `:129`, `:157`, `:183`, `:383-384`, `:493`
- Modify: `feed-reminder-up/modules/cycles/ui/components/cycles/mobile-cycle-card.tsx:33`

- [ ] **Step 1: Split sold from rejected in the badge**

At `:229-230`, replace:

```tsx
{cycle.birdsSold > 0 && (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold text-[8px] h-3.5 px-1 uppercase tracking-tighter w-fit">{cycle.birdsSold} Sold</Badge>
)}
```

with:

```tsx
{cycle.birdsOut > 0 && (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold text-[8px] h-3.5 px-1 uppercase tracking-tighter w-fit">{cycle.birdsOut - (cycle.birdsRejected || 0)} Sold</Badge>
)}
{(cycle.birdsRejected || 0) > 0 && (
    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold text-[8px] h-3.5 px-1 uppercase tracking-tighter w-fit">{cycle.birdsRejected} Rejected</Badge>
)}
```

- [ ] **Step 2: Point the live-bird maths at the renamed column**

At `:216` and `:321`, replace `Number(cycle.birdsSold || 0)` with `Number(cycle.birdsOut || 0)`. The arithmetic is unchanged — live birds has always subtracted birds *out*.

- [ ] **Step 3: Shared table columns**

`modules/cycles/ui/components/shared/columns-factory.tsx` drives the desktop cycle table. The guards at `:97-98`, `:113-114` and `:129` must stay on total birds out, so replace each `cycle.birdsSold > 0` with:

```tsx
(cycle.birdsOut ?? cycle.birdsSold ?? 0) > 0
```

The sell/adjust modal props at `:157` and `:183` also mean birds out — keep the prop name, change the source:

```tsx
birdsSold={cycle.birdsOut ?? cycle.birdsSold ?? 0}
```

The live-bird cell at `:383-384`:

```tsx
                const birdsOut = parseInt(String(row.original.birdsOut ?? row.original.birdsSold ?? 0));
                const liveBirds = Math.max(0, doc - mortality - birdsOut);
```

and the remaining-birds cell at `:491-495`:

```tsx
                const doc = parseInt(String(row.original.doc || 0));
                const out = parseInt(String(row.original.birdsOut ?? row.original.birdsSold ?? 0));
                const mortality = parseInt(String(row.original.mortality || 0));
                const remaining = Math.max(0, doc - mortality - out);
```

- [ ] **Step 4: Web mobile card**

`modules/cycles/ui/components/cycles/mobile-cycle-card.tsx:33`, replace:

```ts
    const soldValue = Number(cycle.birdsSold || 0);
```

with:

```ts
    const birdsOutValue = Number(cycle.birdsOut ?? cycle.birdsSold ?? 0);
    const rejectedValue = Number(cycle.birdsRejected || 0);
    const soldValue = Math.max(0, birdsOutValue - rejectedValue);
```

Then check every other use of `soldValue` in that file: any that computes live birds or gates an action becomes `birdsOutValue`; only text that says "sold" keeps `soldValue`.

- [ ] **Step 5: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add modules/admin/components/org-cycles-list.tsx modules/cycles/ui/components/shared/columns-factory.tsx modules/cycles/ui/components/cycles/mobile-cycle-card.tsx
git commit -m "feat(cycles): show sold and rejected separately across web cycle views"
```

---

### Task 10: Production Report shows Rejected

The spec requires the Production Report to state the rejected count instead of having it
disappear into the survival rate. Task 6 stores the number; this surfaces it.

**Files:**
- Modify: `feed-reminder-up/modules/reports/server/services/performance-analytics-service.ts:586-662`
- Modify: `feed-reminder-up/modules/reports/ui/components/production-record-table.tsx:13-22`, `:48-54`, `:62-98`

- [ ] **Step 1: Select the stored column**

In `getMonthlyProductionRecord`, add to the `endedCycles` select object, after `totalDoc: saleMetrics.totalDoc,`:

```ts
                totalBirdsRejected: saleMetrics.totalBirdsRejected,
```

- [ ] **Step 2: Carry it through the per-farmer grouping**

Add `rejected: number;` to the `farmerMap` value type (after `doc: number;`), add `rejected: 0,` to the `existing` default object (after `doc: 0,`), and sum it alongside DOC — after `existing.doc += Number(cycle.totalDoc);` add:

```ts
            existing.rejected += Number(cycle.totalBirdsRejected) || 0;
```

Then in the returned object, after `doc: f.doc,` add:

```ts
            rejected: f.rejected,
```

Rejected is a count, so it sums across a farmer's cycles like DOC — it is not averaged like FCR.

- [ ] **Step 3: Add the column to the table**

In `production-record-table.tsx`, add to the `ProductionRecord` interface after `doc: number;`:

```ts
    rejected: number;
```

Add a total next to the existing ones, after `const totalDoc = ...`:

```ts
    const totalRejected = data.reduce((sum, item) => sum + (item.rejected || 0), 0);
```

Add the header after the DOC one:

```tsx
                        <TableHead className="text-right">Rejected</TableHead>
```

Add the body cell after the DOC cell:

```tsx
                            <TableCell className="text-right">{(record.rejected || 0).toLocaleString()}</TableCell>
```

Add the summary cell after the DOC summary cell:

```tsx
                        <TableCell className="text-right">{totalRejected.toLocaleString()}</TableCell>
```

- [ ] **Step 4: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. An error on `rejected` missing from a `ProductionRecord` literal means a caller builds that shape too — add `rejected: 0` there and note it for review.

- [ ] **Step 5: Check by hand**

Run: `npm run dev`, open the Production Report for a month containing a cycle that had rejects, and confirm the Rejected column shows the cycle-wide count and that survival rate matches `(doc - mortality - rejected) / doc`.

- [ ] **Step 6: Commit**

```bash
git add modules/reports/
git commit -m "feat(reports): show rejected birds on the Production Report"
```

---

### Task 11: Web report copy text matches mobile

**Files:**
- Modify: `feed-reminder-up/modules/cycles/ui/components/cycles/sales-history-card.tsx:58-118`

- [ ] **Step 1: Replace the template**

In `generateReportText`, the derived values above the `return` stay as they are. Add these four lines directly before the `return`:

```ts
    const birdsRejected = Number(report?.birdsRejected ?? (sale as any).birdsRejected ?? 0);
    const previousSold = Number((sale as any).previousBirdsSold ?? 0);
    const previousRejected = Number((sale as any).previousBirdsRejected ?? 0);
    const saleAge = (sale as any).saleAge ?? sale.cycleContext?.age ?? "N/A";
```

Then replace the whole template literal that currently starts `Date: ${format(new Date(sale.saleDate), "dd MMM yyyy")}` with:

```ts
    return `Date: ${format(new Date(sale.saleDate), "dd MMM yyyy")}

Farmer: ${sale.farmerName || "N/A"}
Location: ${sale.location || "N/A"}
${sale.cycleContext?.birdType ? `\nBird Type: ${sale.cycleContext?.birdType}` : ""}
${doc ? `House bird : ${doc}pcs` : ""}
${previousSold > 0 ? `Previously Sold: ${previousSold}pcs\n` : ""}${previousRejected > 0 ? `Previously Rejected: ${previousRejected}pcs\n` : ""}Today's Sale : ${birdsSold}pcs${birdsRejected > 0 ? `\nRejected : ${birdsRejected}pcs` : ""}
Total Mortality: ${totalMortality} pcs
${(!isEnded || !isLatest) ? `\nRemaining Birds: ${sale.remainingBirds ?? 0} pcs` : ""}

Age: ${saleAge} days
Weight: ${totalWeight} kg
Avg. Weight: ${avgWeight} kg
${isEnded && isLatest ? `
FCR: ${fcr}
EPI: ${epi}
` : ""}
Price : ${pricePerKg} tk
Total taka : ${parseFloat(totalAmount).toLocaleString()} tk
Deposit: ${depositReceived ? `${parseFloat(depositReceived).toLocaleString()} tk` : ""}
Cash: ${parseFloat(cashReceived || "0").toLocaleString()} tk

Feed: ${feedTotal} bags
${feedBreakdown}
${stockBreakdown !== "None" ? `\nStock:\n${stockBreakdown}\n` : ""}
Medicine: ${medicineCost ? parseFloat(medicineCost).toLocaleString() : 0} tk
${!isEnded || !isLatest ? "\n--- Sale not complete ---" : ""}`;
```

The mobile version also prints a `DOC In:` line from `officialInputDate`. This template has no such value in scope, so it is deliberately omitted — matching it would need the same `officialInputDate` resolution chain the mobile card uses, which is out of scope here.

- [ ] **Step 2: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. If `previousBirdsSold` is flagged as unknown, the `as any` casts in Step 1 are missing.

- [ ] **Step 3: Check by hand**

Run: `npm run dev`, open a farmer with a multi-sale cycle, copy the second sale's report, and confirm it shows `Previously Sold` and `Previously Rejected` as separate lines with the numbers the mobile app produces for the same sale.

- [ ] **Step 4: Commit**

```bash
git add modules/cycles/ui/components/cycles/sales-history-card.tsx
git commit -m "feat(web): match the mobile sale report format"
```

---

### Task 12: Open the backend PR

- [ ] **Step 1: Push and open**

```bash
cd /c/Users/amiba/Projects/feed-reminder-up
git push -u origin feat/rejected-bird-columns
gh pr create --base main --head feat/rejected-bird-columns \
  --title "feat(cycles): first-class rejected bird counts" \
  --body "Implements docs/superpowers/specs/2026-09-24-rejected-bird-handling-design.md (in the poultry-solution repo).

Renames cycles/cycle_history birds_sold to birds_out, adds birds_rejected to both, adds total_birds_rejected to sale_metrics, and makes SaleMetricsService sum rejects across every sale instead of reading the latest one. Released mobile apps keep working through a deprecated birdsSold alias.

Verified with scripts/verify-bird-math.ts: 0 mismatches on dev after backfill.

Production has NOT been migrated yet — see Task 13 of the plan.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Confirm**

Run: `gh pr view --json number,url`
Expected: the new PR number and URL.

---

### Task 13: Production rollout

Do not start until the PR from Task 12 is merged. **Targets production** (`.env` line 2 uncommented, line 5 commented).

- [ ] **Step 1: Fresh production backup**

Run: `npm run db:backup`
Expected: `✅ Backup completed successfully`. Note the filename — this is the rollback.

- [ ] **Step 2: Record the before state**

Run: `npm run verify:birds > database_backup/verify-before-prod-final.txt 2>&1; echo "exit=$?"`
Expected: non-zero exit, mismatches listed.

- [ ] **Step 3: Migrate**

Run: `npm run migrate:rejected-birds`
Expected: the `before:` and `after:` lines, with `with_sales` and `total` IDENTICAL across
them. **Never run `drizzle-kit migrate` on this project** — `drizzle.__drizzle_migrations`
is empty, so it would replay all ten historical migrations against a populated database.

- [ ] **Step 4: Confirm the rename kept the data**

Run:
```bash
npx tsx -e "import 'dotenv/config';import {sql} from 'drizzle-orm';import {db} from './db';db.execute(sql\`SELECT COUNT(*) FILTER (WHERE birds_out > 0) AS with_sales, COUNT(*) FILTER (WHERE birds_rejected > 0) AS with_rejects, COUNT(*) AS total FROM cycles\`).then((r:any)=>{console.log(Array.isArray(r)?r:r.rows);process.exit(0)})"
```
Expected: `with_sales` greater than zero and equal to the `before:` count printed in Step 3.
**If it is zero, stop and restore from the Step 1 backup with `npm run db:restore`.**

Then run the two `information_schema` and backfill-agreement checks from Task 4 Steps 4-5
against production. Do NOT use `drizzle-kit push` to verify — it is the command that prompts
destructively on a rename.

- [ ] **Step 5: Deploy backend and web together**

Deploy the merged `main`. Both apps read `birdsOut`, and old phones read the alias.

- [ ] **Step 6: Backfill the metrics**

Run: `npm run backfill:metrics`
Expected: `failed=0`

- [ ] **Step 7: Prove it**

Run: `npm run verify:birds > database_backup/verify-after-prod.txt 2>&1; echo "exit=$?"`
Expected: `exit=0`, `0 wrong` on both checks. Diff against `verify-before-prod-final.txt` to see which farmers' survival rates moved.

- [ ] **Step 8: Restore `.env` to dev**

Comment line 2, uncomment line 5. Confirm with `grep -n DATABASE_URL .env` that only line 5 is active.

---

### Task 14: Mobile — cycle card

**Files:**
- Modify: `poultry-solution/components/cycles/cycle-card.tsx:55-56`, `:96-105`, `:232`, `:236`, `:244`

- [ ] **Step 1: Split the values**

Replace lines 55-56:

```ts
    const soldValue = Number(cycle.birdsSold || 0);
    const liveBirdsValue = Math.max(0, docValue - mortalityValue - soldValue);
```

with:

```ts
    // birdsOut counts every bird that left the house, rejected ones included.
    const birdsOutValue = Number(cycle.birdsOut ?? cycle.birdsSold ?? 0);
    const rejectedValue = Number(cycle.birdsRejected || 0);
    const soldValue = Math.max(0, birdsOutValue - rejectedValue);
    const liveBirdsValue = Math.max(0, docValue - mortalityValue - birdsOutValue);
```

- [ ] **Step 2: Keep the action guards on the total**

At `:232`, `:236` and `:244`, replace every `soldValue > 0` and `soldValue === 0` with `birdsOutValue > 0` and `birdsOutValue === 0`. A cycle whose only activity was a rejects-only sale must stay locked.

- [ ] **Step 3: Show rejected in the badge**

At `:96-105`, the badge currently renders when `soldValue > 0` and prints `{soldValue} SOLD`. Change the condition to `birdsOutValue > 0`, keep the `{soldValue} SOLD` text, and add directly after that badge block:

```tsx
                            {rejectedValue > 0 && (
                                <Text className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                                    {rejectedValue} REJECTED
                                </Text>
                            )}
```

- [ ] **Step 4: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors in `components/cycles/cycle-card.tsx`. Pre-existing errors in `components/farmers/feed-type-input.tsx` are unrelated and stay.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/amiba/Projects/poultry-solution
git checkout -b feat/rejected-bird-display main
git add components/cycles/cycle-card.tsx
git commit -m "feat(cycles): show sold and rejected apart on the cycle card"
```

---

### Task 15: Mobile — remaining readers

The cycle detail screen was already split in PR #3; it now reads the new fields. Everything else in this task keeps its arithmetic and only moves to the renamed field, with a fallback so the app still works against an un-migrated API.

**Files:**
- Modify: `poultry-solution/app/cycle/[id].tsx:98-99`
- Modify: `poultry-solution/app/(drawer)/(tabs)/cycles.tsx:435`, `:582`, `:586`, `:594`
- Modify: `poultry-solution/app/(drawer)/(tabs)/overview.tsx:157`
- Modify: `poultry-solution/components/dashboard/recent-activity.tsx:51`
- Modify: `poultry-solution/lib/export.ts:1015`, `:1100`
- Modify: `poultry-solution/app/farmer/[id].tsx:855`
- Modify: `poultry-solution/app/cycle/[id].tsx:635`

- [ ] **Step 1: Cycle detail reads the stored column**

`app/cycle/[id].tsx:98-99`, replace:

```ts
    const birdsOutValue = cycle.birdsSold ?? 0;
    const rejectedValue = (cycle as any).totalBirdsRejected ?? 0;
```

with:

```ts
    const birdsOutValue = (cycle as any).birdsOut ?? cycle.birdsSold ?? 0;
    const rejectedValue = (cycle as any).birdsRejected ?? (cycle as any).totalBirdsRejected ?? 0;
```

- [ ] **Step 2: Live-bird counts**

In `app/(drawer)/(tabs)/overview.tsx:157`, `components/dashboard/recent-activity.tsx:51`, `lib/export.ts:1015` and `lib/export.ts:1100`, replace `(c.birdsSold || 0)` / `(cycle.birdsSold || 0)` with `(c.birdsOut ?? c.birdsSold ?? 0)` / `(cycle.birdsOut ?? cycle.birdsSold ?? 0)`, keeping each expression otherwise identical.

- [ ] **Step 3: Sell-modal props and list guards**

`app/(drawer)/(tabs)/cycles.tsx:435`, `app/farmer/[id].tsx:855` and `app/cycle/[id].tsx:635` pass a `birdsSold` prop to `SellModal`, which uses it as birds-out. Keep the prop name, change the source:

```tsx
birdsSold={selectedCycle.birdsOut ?? selectedCycle.birdsSold ?? 0}
```

`app/cycle/[id].tsx:635` has two fallbacks — `selectedActionCycle?.birdsOut ?? selectedActionCycle?.birdsSold ?? cycle.birdsOut ?? cycle.birdsSold ?? 0`.

At `cycles.tsx:582`, `:586` and `:594`, the edit guards read `(groupMenuCycle?.birdsSold || 0) > 0`; change each to `((groupMenuCycle?.birdsOut ?? groupMenuCycle?.birdsSold) || 0) > 0`.

- [ ] **Step 4: Compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors. Only the two pre-existing `feed-type-input.tsx` warnings remain.

- [ ] **Step 5: Manual check against the migrated dev API**

Run: `npx expo start`, point the app at the dev backend, then confirm: a cycle with rejects shows sold and rejected apart on the card and the detail screen; live-bird counts on the dashboard match the detail screen; Edit DOC stays greyed out on a cycle that has sold.

- [ ] **Step 6: Commit**

```bash
git add app components lib
git commit -m "feat(cycles): read birdsOut and birdsRejected across the app"
```

---

### Task 16: Mobile PR and QA

- [ ] **Step 1: Push and open**

Replace `PR_NUMBER` below with the number printed by Task 12 Step 2 before running the command.

```bash
cd /c/Users/amiba/Projects/poultry-solution
git push -u origin feat/rejected-bird-display
gh pr create --base main --head feat/rejected-bird-display \
  --title "feat(cycles): show rejected birds apart from sold" \
  --body "Implements the display half of docs/superpowers/specs/2026-09-24-rejected-bird-handling-design.md.

Reads the new birdsOut / birdsRejected fields with a fallback to the deprecated birdsSold alias, so this builds works against both the migrated and un-migrated API. Sold and rejected are shown separately on the cycle card and detail screen; edit guards still key off total birds out.

Depends on bayezid-hossain/new-hope#PR_NUMBER.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Work the QA list from the spec**

Against the migrated dev backend:

1. Two-sale cycle, rejects in sale 1 only — sale 2's copied report reads `Previously Sold: 300pcs` and `Previously Rejected: 45pcs`.
2. Three-sale cycle, rejects in sales 1 and 3 — the middle sale's report splits correctly (this is the case the old client-side fallback could not do).
3. A sale adjusted to a different rejected count — switch versions with the version picker and confirm the report, the cycle card and the cycle screen all agree.
4. Cycle screen survival rate equals the Production Report survival rate for the same cycle.

- [ ] **Step 3: Record results in the PR**

Comment on the PR with the four outcomes. Anything that fails goes back to the task that owns it rather than being patched in place.

---

## Notes for whoever executes this

- **`sale_events.birdsSold` and `sale_reports.birdsSold` are not renamed.** Those are per-sale and already mean sold-only. Only the two cycle-level columns move.
- **The rename is the only destructive step.** It is hand-written DDL inside one transaction (Task 3), because these databases are push-managed and `drizzle.__drizzle_migrations` is empty. Never run `drizzle-kit migrate` or `generate` here. The gate is the `before:`/`after:` count printed by the migration script.
- **Two omissions are deliberate,** recorded in the spec: no shared arithmetic module, and the `averageAge` numerator/denominator mismatch at `sale-metrics-service.ts:188` stays as it is. Do not fix either as a drive-by.
- **Expect stored survival rates to fall** for cycles with rejects in a non-final sale. That is the repair, not a regression.
