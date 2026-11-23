import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatTransferMessage } from "@/lib/feed-transfer";
import { trpc } from "@/lib/trpc";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { toast } from "sonner-native";

interface CopyTransferButtonProps {
    referenceId: string;
    // "icon" fits the tight icon column of the farmer ledger, "chip" the stock ledger rows.
    variant?: "icon" | "chip";
}

// Rebuilds the feed transfer message for a past transfer (same text the transfer modal copies on success).
export function CopyTransferButton({ referenceId, variant = "chip" }: CopyTransferButtonProps) {
    const utils = trpc.useUtils();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const [busy, setBusy] = useState(false);

    const onPress = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const summary =
                membership?.activeMode === "MANAGEMENT"
                    ? await utils.management.stock.getTransferSummary.fetch({ orgId: membership.orgId ?? "", referenceId })
                    : await utils.officer.stock.getTransferSummary.fetch({ referenceId });
            await Clipboard.setStringAsync(
                formatTransferMessage({
                    date: new Date(summary.date),
                    fromFarmer: summary.fromFarmer,
                    toFarmer: summary.toFarmer,
                    lines: summary.lines,
                }),
            );
            toast.success("Transfer message copied");
        } catch (e: any) {
            toast.error(e?.message || "Could not copy the transfer message");
        } finally {
            setBusy(false);
        }
    };

    const content = busy ? (
        <ActivityIndicator size="small" />
    ) : (
        <>
            <Icon as={Copy} size={12} className="text-primary" />
            {variant === "chip" && <Text className="text-[9px] font-black text-primary uppercase tracking-wide">Copy</Text>}
        </>
    );

    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            className={
                variant === "icon"
                    ? "h-6 w-6 rounded-lg items-center justify-center active:bg-accent"
                    : "flex-row items-center gap-1 self-start mt-1 px-1.5 py-0.5 rounded-md bg-primary/10 active:opacity-70"
            }
        >
            {content}
        </Pressable>
    );
}
