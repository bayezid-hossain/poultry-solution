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
                toast.info("Cycle mortality was not changed because birds have already been sold.");
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
