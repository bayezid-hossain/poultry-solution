import assert from "node:assert/strict";
import { formatBags, formatTransferMessage } from "../lib/feed-transfer";

assert.equal(formatBags(1), "1 bag");
assert.equal(formatBags(5), "5 bags");
assert.equal(formatBags(2.5), "2.5 bags");
assert.equal(formatBags(0.5), "0.5 bags");

const date = new Date(2026, 10, 22);

assert.equal(
    formatTransferMessage({
        date,
        fromFarmer: "Rahim Poultry Farm",
        toFarmer: "Karim Agro Farm",
        lines: [
            { feedType: "B1", quantity: 5 },
            { feedType: "B2", quantity: 1 },
        ],
    }),
    [
        "Date: 22 Nov 2026",
        "Feed Transfer",
        "",
        "From: Rahim Poultry Farm",
        "To: Karim Agro Farm",
        "",
        "Quantity:",
        "- 5 bags (B1)",
        "- 1 bag (B2)",
        "Total: 6 bags",
    ].join("\n"),
);

// a line with no feed type drops the brackets, and decimals add up without float noise
assert.equal(
    formatTransferMessage({
        date,
        fromFarmer: "A",
        toFarmer: "B",
        lines: [
            { feedType: null, quantity: 0.1 },
            { feedType: "", quantity: 0.2 },
        ],
    }),
    ["Date: 22 Nov 2026", "Feed Transfer", "", "From: A", "To: B", "", "Quantity:", "- 0.1 bags", "- 0.2 bags", "Total: 0.3 bags"].join("\n"),
);

// a single line still prints a total
assert.match(
    formatTransferMessage({ date, fromFarmer: "A", toFarmer: "B", lines: [{ feedType: "B1", quantity: 1 }] }),
    /Total: 1 bag$/,
);

console.log("feed-transfer lib: all assertions passed");
