import { OfficerKpiCards } from '@/components/dashboard/officer-kpi-cards';
import { PerformanceInsights } from '@/components/dashboard/performance-insights';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { UrgentActions } from '@/components/dashboard/urgent-actions';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { trpc } from '@/lib/trpc';
import { useFocusEffect } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, ToastAndroid, View } from 'react-native';

export default function HomeScreen() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: membership } = trpc.auth.getMyMembership.useQuery();
  const orgId = membership?.orgId || "";
  const currentCount = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setTimeout(() => {
          currentCount.current = 0;
        }, 2000); // Reset after 2 seconds

        if (currentCount.current === 0) {
          currentCount.current = 1;
          ToastAndroid.show("Swipe again or press back to exit", ToastAndroid.SHORT);
          return true; // Prevent default back (which usually does nothing at root)
        } else if (currentCount.current === 1) {
          BackHandler.exitApp();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const { data: stats, isLoading: statsLoading } = trpc.officer.getDashboardStats.useQuery(
    { orgId },
    { enabled: !!orgId }
  );

  const { data: cyclesData, isLoading: cyclesLoading } = trpc.officer.cycles.listActive.useQuery(
    {
      orgId,
      page: 1,
      pageSize: 100
    },
    { enabled: !!orgId }
  );

  if (statsLoading || cyclesLoading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Dashboard" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
        </View>
      </View>
    );
  }

  const cycles = cyclesData?.items || [];

  // --- DERIVED LOGIC ---

  // 1. Urgent Needs: Low feed stock (< 3 bags)
  const farmerConsumptionMap = new Map<string, number>();
  cycles.forEach((c: any) => {
    const current = farmerConsumptionMap.get(c.farmerId) || 0;
    farmerConsumptionMap.set(c.farmerId, current + (c.intake || 0));
  });

  const lowStockCycles = cycles
    .map((c: any) => {
      const totalConsumption = farmerConsumptionMap.get(c.farmerId) || 0;
      const initialStock = (c as any).farmerMainStock || 0;
      const availableStock = initialStock - totalConsumption;
      return { ...c, availableStock };
    })
    .filter((c: any, index: number, self: any[]) =>
      index === self.findIndex((t: any) => t.farmerId === c.farmerId)
    )
    .filter((c: any) => c.availableStock < 3)
    .sort((a: any, b: any) => a.availableStock - b.availableStock);

  // 2. Performance Aggregation
  const farmerStatsMap = new Map<string, {
    farmerId: string;
    farmerName: string;
    totalIntake: number;
    totalDoc: number;
    totalMortality: number;
    activeCyclesCount: number;
  }>();

  cycles.forEach((cycle: any) => {
    const existing = farmerStatsMap.get(cycle.farmerId) || {
      farmerId: cycle.farmerId,
      farmerName: cycle.farmerName,
      totalIntake: 0,
      totalDoc: 0,
      totalMortality: 0,
      activeCyclesCount: 0
    };

    existing.totalIntake += (cycle.intake || 0);
    existing.totalDoc += (cycle.doc || 0);
    existing.totalMortality += (cycle.mortality || 0);
    existing.activeCyclesCount += 1;

    farmerStatsMap.set(cycle.farmerId, existing);
  });

  const aggregatedFarmers = Array.from(farmerStatsMap.values());

  const topPerformers = [...aggregatedFarmers]
    .sort((a, b) => {
      const rateA = a.totalDoc > 0 ? a.totalMortality / a.totalDoc : 0;
      const rateB = b.totalDoc > 0 ? b.totalMortality / b.totalDoc : 0;
      return rateA - rateB;
    })
    .slice(0, 5)
    .map(f => ({
      ...f,
      avgMortalityRate: f.totalDoc > 0 ? (f.totalMortality / f.totalDoc) * 100 : 0
    }));

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" />
      <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
        {/* Premium Welcome Header */}
        <View className="flex-row items-center gap-3 mb-6">
          <View className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Icon as={Activity} size={24} color="text-foreground" />
          </View>
          <View>
            <Text className="text-2xl font-black text-foreground tracking-tighter uppercase">
              Home
            </Text>
            <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">
              {membership?.orgName || "Operations Intelligence"}
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        {stats && (
          <View className="mb-8">
            <OfficerKpiCards
              totalBirds={stats.totalBirds}
              totalBirdsSold={stats.totalBirdsSold}
              totalFeedStock={stats.totalFeedStock}
              activeConsumption={stats.activeConsumption}
              availableStock={stats.availableStock}
              lowStockCount={stats.lowStockCount}
              avgMortality={stats.avgMortality}
              activeCyclesCount={stats.activeCyclesCount}
              totalFarmers={stats.totalFarmers}
            />
          </View>
        )}

        <Separator className="mb-8 opacity-50" />

        {/* Urgent Needs, Activity & Top Performers */}
        <View className="gap-6">
          <UrgentActions lowStockCycles={lowStockCycles} canEdit={true} />
          <RecentActivity cycles={cycles as any} />
          <PerformanceInsights topPerformers={topPerformers} />
        </View>
      </ScrollView>
    </View>
  );
}
