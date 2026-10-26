import { DateField } from "@/components/farmer-visits/date-field";
import { FeedLineDraft, FeedLinesEditor } from "@/components/farmer-visits/feed-lines-editor";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProBlocker } from "@/components/pro-blocker";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import {
    calcAge, calcAvgFcr, calcLiveBirds, DEFAULT_LITTER, DEFAULT_SUGGESTIONS, formatVisitMessage, sumFeed, type FeedLine,
} from "@/lib/farmer-visit";
import { useFarmerVisitApi } from "@/lib/use-farmer-visit-api";
import { trpc } from "@/lib/trpc";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { format } from "date-fns";
import { ChevronLeft, Copy, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
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
    const { orgId, api, isPro } = useFarmerVisitApi();

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
    const [previewing, setPreviewing] = useState(false);

    const prefill = api.getPrefill.useQuery(
        { orgId, cycleId, date: visitDate },
        // Always fetch fresh: the cycle may have been corrected (age, mortality, DOC) since this was last cached.
        { enabled: !!orgId && !!cycleId && isPro, staleTime: 0, gcTime: 0, refetchOnMount: "always" },
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
                    ? existing.feedLines.map((l: FeedLine) => ({
                          type: l.type, intake: String(l.intake), running: String(l.running), stock: String(l.stock),
                      }))
                    : blankLines(),
            );
            setLitter(existing.litter);
            setDisease(existing.disease);
            setMedicine(existing.medicine);
            setSuggestions(existing.suggestions);
        } else {
            setAge(String(calcAge(visitDate, new Date(prefill.data.cycle.ageStartDate))));
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
        { enabled: !!orgId && isPro && age !== "" },
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
        onSuccess: async (res) => {
            // Copy the saved message right away so it can be pasted straight into chat.
            await Clipboard.setStringAsync(
                buildMessage({
                    avgFcr: Number(res.report.avgFcr),
                    stdWeightG: res.report.stdWeightG ?? null,
                    stdFcr: res.report.stdFcr == null ? null : Number(res.report.stdFcr),
                }),
            );
            toast.success(existing ? "Report updated and copied" : "Report saved and copied");
            if (!res.mortalitySynced && cycle && toInt(totalMortality) !== cycle.mortality) {
                toast.info("Cycle mortality was not changed because birds have already been sold.");
            }
            utils.invalidate();
            router.back();
        },
        onError: (e) => toast.error(e.message),
    });

    const buildMessage = (override?: { avgFcr: number; stdWeightG: number | null; stdFcr: number | null }) =>
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
            stdWeightG: override ? override.stdWeightG : stdWeightG,
            avgFcr: override ? override.avgFcr : avgFcr,
            stdFcr: override ? override.stdFcr : stdFcr,
            feedLines,
            litter: litter.trim() || DEFAULT_LITTER,
            disease,
            medicine,
            suggestions,
        });

    const onCopy = async () => {
        await Clipboard.setStringAsync(buildMessage());
        toast.success("Report copied");
    };

    const validate = (): boolean => {
        if (!cycle) return false;
        if (feedLines.length === 0) { toast.error("Add at least one feed type"); return false; }
        const names = feedLines.map((l) => l.type.toLowerCase());
        if (new Set(names).size !== names.length) { toast.error("Feed type names must be unique"); return false; }
        if (toInt(totalMortality) + cycle.birdsOut > cycle.doc) {
            toast.error(`Total mortality cannot exceed initial birds (${cycle.doc})`);
            return false;
        }
        return true;
    };

    const onViewReport = () => {
        if (validate()) setPreviewing(true);
    };

    const onSave = () => {
        if (!validate()) return;
        save.mutate({
            orgId,
            cycleId,
            visitDate,
            age: ageNum,
            todayMortality: toInt(todayMortality),
            totalMortality: toInt(totalMortality),
            avgWeightG: toInt(avgWeight),
            feedLines,
            litter: litter.trim() || DEFAULT_LITTER,
            disease,
            medicine,
            suggestions,
        });
    };

    // The form lives in the app's BottomSheetModal so its keyboard handling keeps lower fields visible.
    // Called as a function (not a component) so the sheet and its inputs are not remounted on each render.
    const sheet = (children: React.ReactNode) => (
        <View className="flex-1">
            <Stack.Screen options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
            <BottomSheetModal open fullScreen onOpenChange={(o) => { if (!o) router.back(); }}>
                <View className="flex-1">{children}</View>
            </BottomSheetModal>
        </View>
    );

    const header = (
        <View className="flex-row items-center px-4 pt-5 pb-3 border-b border-border">
            {previewing ? (
                <Pressable
                    onPress={() => setPreviewing(false)}
                    className="w-10 h-10 items-center justify-center rounded-lg active:bg-accent mr-2"
                >
                    <Icon as={ChevronLeft} size={22} className="text-foreground" />
                </Pressable>
            ) : null}
            <Text className="text-xl font-bold text-foreground flex-1" numberOfLines={1}>
                {previewing ? "View Report" : existing ? "Edit Farmer Visit" : "Farmer Visit"}
            </Text>
            {previewing ? null : (
                <Pressable
                    onPress={() => router.back()}
                    hitSlop={8}
                    className="w-10 h-10 items-center justify-center rounded-full active:bg-accent"
                >
                    <Icon as={X} size={20} className="text-muted-foreground" />
                </Pressable>
            )}
        </View>
    );

    if (!isPro) {
        return sheet(
            <>
                {header}
                <ProBlocker feature="Farmer Visit Reports" description="Create, track and share farmer visit reports with automatic FCR and standard comparisons." />
            </>,
        );
    }

    if (prefill.isLoading || !orgId) {
        return sheet(
            <>
                {header}
                <View className="flex-1 items-center justify-center"><BirdyLoader /></View>
            </>,
        );
    }

    if (prefill.isError || !cycle || !farmer) {
        return sheet(
            <>
                {header}
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <Text className="text-center text-muted-foreground">
                        {prefill.error?.message ?? "Could not load this cycle."}
                    </Text>
                    <Button variant="outline" onPress={() => prefill.refetch()}><Text>Try again</Text></Button>
                </View>
            </>,
        );
    }

    if (previewing) {
        return sheet(
            <>
                {header}
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                    <View className="rounded-2xl border border-border/50 bg-background p-4">
                        <Text selectable className="text-sm leading-6 text-foreground">{buildMessage()}</Text>
                    </View>
                </ScrollView>
                <View
                    className="px-4 pt-3 border-t border-border gap-2"
                    style={{ paddingBottom: insets.bottom + 12 }}
                >
                    <Button variant="outline" onPress={onCopy} className="h-11 rounded-xl active:scale-[0.98]">
                        <Icon as={Copy} size={16} className="text-foreground" />
                        <Text className="font-bold">Copy</Text>
                    </Button>
                    <View className="flex-row gap-2">
                        <Button variant="outline" onPress={() => setPreviewing(false)} disabled={save.isPending} className="flex-1 h-12 rounded-xl active:scale-[0.98]">
                            <Text className="font-bold">Back to edit</Text>
                        </Button>
                        <Button onPress={onSave} disabled={save.isPending} className="flex-1 h-12 rounded-xl active:scale-[0.98]">
                            <Text className="font-bold">{save.isPending ? "Saving..." : existing ? "Update report" : "Save report"}</Text>
                        </Button>
                    </View>
                </View>
            </>,
        );
    }

    return sheet(
        <>
            {header}
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Read-only cycle summary */}
                <View className="rounded-2xl border border-border/50 bg-background p-4 gap-1">
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
                className="px-4 pt-3 border-t border-border"
                style={{ paddingBottom: insets.bottom + 12 }}
            >
                <Button onPress={onViewReport} className="h-12 rounded-xl active:scale-[0.98]">
                    <Text className="font-bold">View report</Text>
                </Button>
            </View>
        </>,
    );
}
