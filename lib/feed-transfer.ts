import { format } from "date-fns";

export type TransferLine = { feedType: string | null; quantity: number };

export type TransferMessageInput = {
    date: Date;
    fromFarmer: string;
    toFarmer: string;
    lines: TransferLine[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function formatBags(quantity: number): string {
    return `${quantity} ${quantity === 1 ? "bag" : "bags"}`;
}

// The message pasted into chat after a feed transfer, and re-copied later from the stock ledger.
export function formatTransferMessage(t: TransferMessageInput): string {
    const total = round2(t.lines.reduce((sum, l) => sum + l.quantity, 0));
    return [
        `Date: ${format(t.date, "dd MMM yyyy")}`,
        "Feed Transfer",
        "",
        `From: ${t.fromFarmer}`,
        `To: ${t.toFarmer}`,
        "",
        "Quantity:",
        ...t.lines.map((l) => `- ${formatBags(round2(l.quantity))}${l.feedType ? ` (${l.feedType})` : ""}`),
        `Total: ${formatBags(total)}`,
    ].join("\n");
}
