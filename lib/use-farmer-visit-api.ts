import { trpc } from "@/lib/trpc";

// Both routers expose the same procedures; management sees the whole org, officers their own farmers.
export function useFarmerVisitApi() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    return {
        orgId: membership?.orgId ?? "",
        isManagement,
        api: isManagement ? trpc.management.farmerVisits : trpc.officer.farmerVisits,
    };
}
