import { differenceInCalendarDays, parseISO } from "date-fns";

export type FeedLine = { type: string; intake: number; running: number; stock: number };

export const KG_PER_BAG = 50;

export const DEFAULT_LITTER = "Dry";

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
