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
    "Suggestions: Maintain curtain management, Feeder and Dribler.",
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
