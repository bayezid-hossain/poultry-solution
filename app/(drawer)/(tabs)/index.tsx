import { ManagementMembersList } from '@/components/dashboard/management-members-list';
import { ManagementProductionTree } from '@/components/dashboard/management-production-tree';
import { ManagementStatsCards } from '@/components/dashboard/management-stats-cards';
import { OfficerKpiCards } from '@/components/dashboard/officer-kpi-cards';
import { PerformanceInsights } from '@/components/dashboard/performance-insights';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SmartWatchdog } from '@/components/dashboard/smart-watchdog';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { LoadingState } from '@/components/ui/loading-state';
import { Text } from '@/components/ui/text';
import { trpc } from '@/lib/trpc';
import { useFocusEffect } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Pressable, RefreshControl, ScrollView, ToastAndroid, View } from 'react-native';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "operations">("overview");
  const [managementSubTab, setManagementSubTab] = useState<"members" | "production">("members");
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

  const activeMode = membership?.activeMode || "OFFICER";
  const isManagement = activeMode === "MANAGEMENT";

  // --- STATS FETCHING ---
  const { data: officerStats, isLoading: officerStatsLoading, refetch: refetchOfficerStats } = trpc.officer.getDashboardStats.useQuery(
    { orgId },
    { enabled: !!orgId && !isManagement }
  );

  const { data: managementStats, isLoading: managementStatsLoading, refetch: refetchManagementStats } = trpc.management.analytics.getGlobalDashboardStats.useQuery(
    { orgId },
    { enabled: !!orgId && isManagement }
  );

  const stats = isManagement ? managementStats : officerStats;
  const statsLoading = isManagement ? managementStatsLoading : officerStatsLoading;

  // --- CYCLES FETCHING ---
  const { data: officerCyclesData, isLoading: officerCyclesLoading, refetch: refetchOfficerCycles } = trpc.officer.cycles.listActive.useQuery(
    { orgId, page: 1, pageSize: 100 },
    { enabled: !!orgId && !isManagement }
  );

  const { data: managementCyclesData, isLoading: managementCyclesLoading, refetch: refetchManagementCycles } = trpc.management.cycles.listActive.useQuery(
    { orgId, page: 1, pageSize: 100 },
    { enabled: !!orgId && isManagement }
  );

  const cyclesData = isManagement ? managementCyclesData : officerCyclesData;
  const cyclesLoading = isManagement ? managementCyclesLoading : officerCyclesLoading;

  const { data: watchdogData, isPending: watchdogPending, mutate: fetchWatchdog, mutateAsync: fetchWatchdogAsync } = trpc.ai.generateSupplyChainPrediction.useMutation();

  useFocusEffect(
    useCallback(() => {
      if (orgId) {
        fetchWatchdog({
          orgId,
          officerId: !isManagement ? session?.user?.id : undefined
        });
      }
    }, [orgId, fetchWatchdog, isManagement, session?.user?.id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const refetchStats = isManagement ? refetchManagementStats : refetchOfficerStats;
    const refetchCycles = isManagement ? refetchManagementCycles : refetchOfficerCycles;

    const promises: Promise<any>[] = [refetchStats(), refetchCycles()];
    if (orgId) {
      promises.push(fetchWatchdogAsync({
        orgId,
        officerId: !isManagement ? session?.user?.id : undefined
      }));
    }
    await Promise.all(promises);
    setRefreshing(false);
  }, [refetchOfficerStats, refetchManagementStats, refetchOfficerCycles, refetchManagementCycles, orgId, fetchWatchdogAsync, isManagement, session?.user?.id]);

  if (statsLoading || cyclesLoading) {
    return <LoadingState fullPage title="Synchronizing" description="Fetching Global Operations..." />;
  }

  const cycles = cyclesData?.items || [];

  // --- DERIVED LOGIC REMOVED (Handled by Backend Watchdog) ---

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
      <ScrollView
        contentContainerClassName="p-4 pb-20"
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" colors={["#16a34a"]} />
        }
      >
        {/* Premium Welcome Header */}
        <View className="flex-row items-center gap-3 mb-6">
          <View className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Icon as={Activity} size={24} color="#16a34a" />
          </View>
          <View>
            <Text className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
              {isManagement ? "MANAGEMENT" : "OFFICER"}
            </Text>
            <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60 mt-1">
              {membership?.orgName || "Operations Intelligence"}
            </Text>
          </View>
        </View>

        {isManagement && (
          <View className="flex-row bg-muted/50 p-1 rounded-xl mb-6 border border-border/50">
            <Pressable
              onPress={() => setActiveTab('overview')}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'overview' ? 'bg-background ' : ''}`}
            >
              <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'overview' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Overview
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('operations')}
              className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'operations' ? 'bg-background ' : ''}`}
            >
              <Text className={`text-xs font-bold uppercase tracking-widest ${activeTab === 'operations' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Active
              </Text>
            </Pressable>
          </View>
        )}

        {/* Management Overview Tab Content */}
        {isManagement && activeTab === 'overview' && (
          <View className="gap-6">
            <ManagementStatsCards orgId={orgId} />
            <SmartWatchdog data={watchdogData?.predictions || []} isLoading={watchdogPending} />

            <View className="flex-row bg-muted/50 p-1 rounded-xl border border-border/50">
              <Pressable
                onPress={() => setManagementSubTab('members')}
                className={`flex-1 py-2 rounded-lg items-center ${managementSubTab === 'members' ? 'bg-background ' : ''}`}
              >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${managementSubTab === 'members' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Members
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setManagementSubTab('production')}
                className={`flex-1 py-2 rounded-lg items-center ${managementSubTab === 'production' ? 'bg-background ' : ''}`}
              >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${managementSubTab === 'production' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Production Tree
                </Text>
              </Pressable>
            </View>

            {managementSubTab === 'members' && <ManagementMembersList orgId={orgId} />}
            {managementSubTab === 'production' && <ManagementProductionTree orgId={orgId} />}
          </View>
        )}

        {/* Operations Tab Content (or Default Officer View) */}
        {(!isManagement || activeTab === 'operations') && (
          <View className="gap-6">
            {stats && (
              <OfficerKpiCards
                totalBirds={stats.totalBirds}
                totalBirdsSold={stats.totalBirdsSold}
                totalFeedStock={stats.totalFeedStock}
                activeConsumption={stats.activeConsumption}
                availableStock={stats.availableStock}
                avgMortality={stats.avgMortality}
                activeCyclesCount={stats.activeCyclesCount}
                totalFarmers={stats.totalFarmers}
              />
            )}

            {!isManagement && (
              <SmartWatchdog data={watchdogData?.predictions || []} isLoading={watchdogPending} />
            )}

            <RecentActivity cycles={cycles as any} />
            <PerformanceInsights topPerformers={topPerformers} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
