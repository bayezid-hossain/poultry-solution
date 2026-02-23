import { ConfirmDocOrderModal } from "@/components/orders/confirm-doc-order-modal";
import { ConfirmFeedOrderModal } from "@/components/orders/confirm-feed-order-modal";
import { CreateDocOrderModal } from "@/components/orders/create-doc-order-modal";
import { CreateFeedOrderModal } from "@/components/orders/create-feed-order-modal";
import { CreateSaleOrderModal } from "@/components/orders/create-sale-order-modal";
import { DeleteDocOrderModal } from "@/components/orders/delete-doc-order-modal";
import { DeleteFeedOrderModal } from "@/components/orders/delete-feed-order-modal";
import { DocOrderCard } from "@/components/orders/doc-order-card";
import { FeedOrderCard } from "@/components/orders/feed-order-card";
import { SaleOrderCard } from "@/components/orders/sale-order-card";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "expo-router";
import { Bird, Factory, Plus, ShoppingBag } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

export default function OrdersScreen() {
    const [activeTab, setActiveTab] = useState<'feed' | 'doc' | 'sale'>('feed');
    const [isCreateFeedOpen, setIsCreateFeedOpen] = useState(false);

    // Feed Action States
    const [editingOrder, setEditingOrder] = useState<any>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

    // DOC Action States
    const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);
    const [editingDocOrder, setEditingDocOrder] = useState<any>(null);
    const [deletingDocOrderId, setDeletingDocOrderId] = useState<string | null>(null);
    const [confirmingDocOrder, setConfirmingDocOrder] = useState<any>(null);

    // Sale Action States
    const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const feedOrdersQuery = trpc.officer.feedOrders.list.useQuery(
        {
            orgId: membership?.orgId ?? "",
            limit: 50,
        },
        { enabled: !!membership?.orgId && activeTab === 'feed' }
    );

    const docOrdersQuery = trpc.officer.docOrders.list.useQuery(
        {
            orgId: membership?.orgId ?? "",
            limit: 50,
        },
        { enabled: !!membership?.orgId && activeTab === 'doc' }
    );

    const saleOrdersQuery = trpc.officer.saleOrders.list.useQuery(
        {
            orgId: membership?.orgId ?? "",
            limit: 50,
        },
        { enabled: !!membership?.orgId && activeTab === 'sale' }
    );

    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'feed') {
                feedOrdersQuery.refetch();
            } else if (activeTab === 'doc') {
                docOrdersQuery.refetch();
            } else {
                saleOrdersQuery.refetch();
            }
        }, [activeTab])
    );

    const renderFeedOrderEmpty = () => {
        if (feedOrdersQuery.isLoading) return null;

        return (
            <View className="flex-1 items-center justify-center p-8 mt-20 opacity-50">
                <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                    <Icon as={Factory} size={24} className="text-muted-foreground" />
                </View>
                <Text className="text-xl font-black text-foreground text-center mb-2 uppercase tracking-tight">
                    No Feed Orders
                </Text>
                <Text className="text-muted-foreground text-center text-sm font-medium">
                    Tap the button above to place a new feed order.
                </Text>
            </View>
        );
    };

    const renderDocOrderEmpty = () => {
        if (docOrdersQuery.isLoading) return null;

        return (
            <View className="flex-1 items-center justify-center p-8 mt-20 opacity-50">
                <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                    <Icon as={Bird} size={24} className="text-muted-foreground" />
                </View>
                <Text className="text-xl font-black text-foreground text-center mb-2 uppercase tracking-tight">
                    No DOC Orders
                </Text>
                <Text className="text-muted-foreground text-center text-sm font-medium">
                    Tap the button above to place a new DOC order.
                </Text>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Order Center" />

            <View className="bg-card border-b border-border/50 px-6 pb-4 pt-4">
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Logistics</Text>
                        <Text className="text-2xl font-black tracking-tighter">Orders</Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            if (activeTab === 'feed') {
                                setIsCreateFeedOpen(true);
                            } else if (activeTab === 'doc') {
                                setIsCreateDocOpen(true);
                            } else {
                                setIsCreateSaleOpen(true);
                            }
                        }}
                        className="bg-primary px-4 py-2.5 rounded-full flex-row items-center gap-2 active:opacity-80"
                    >
                        <Icon as={Plus} size={16} className="text-primary-foreground" />
                        <Text className="text-primary-foreground font-bold text-xs uppercase tracking-wider">New Order</Text>
                    </Pressable>
                </View>

                {/* Segmented Tabs */}
                <View className='flex-row gap-2'>
                    <Button
                        variant={activeTab === 'feed' ? 'default' : 'outline'}
                        className='flex-1 flex-row gap-2 h-11 border-border/50'
                        onPress={() => setActiveTab('feed')}
                    >
                        <Icon as={Factory} className={activeTab === 'feed' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                        <Text className={`font-bold uppercase tracking-wider text-xs ${activeTab === 'feed' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            Feed Orders ({activeTab === 'feed' ? feedOrdersQuery.data?.length || 0 : '-'})
                        </Text>
                    </Button>
                    <Button
                        variant={activeTab === 'doc' ? 'default' : 'outline'}
                        className='flex-1 flex-row gap-2 h-11 border-border/50'
                        onPress={() => setActiveTab('doc')}
                    >
                        <Icon as={Bird} className={activeTab === 'doc' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                        <Text className={`font-bold uppercase tracking-wider text-xs ${activeTab === 'doc' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            DOC Orders ({activeTab === 'doc' ? docOrdersQuery.data?.length || 0 : '-'})
                        </Text>
                    </Button>
                    <Button
                        variant={activeTab === 'sale' ? 'default' : 'outline'}
                        className='flex-1 flex-row gap-2 h-11 border-border/50'
                        onPress={() => setActiveTab('sale')}
                    >
                        <Icon as={ShoppingBag} className={activeTab === 'sale' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                        <Text className={`font-bold uppercase tracking-wider text-xs ${activeTab === 'sale' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            Sale
                        </Text>
                    </Button>
                </View>
            </View>

            {activeTab === 'feed' ? (
                <>
                    {feedOrdersQuery.isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="hsl(var(--primary))" />
                            <Text className='mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs'>Loading Orders...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={feedOrdersQuery.data || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <FeedOrderCard
                                    order={item}
                                    onPress={() => { /* router.push(`/orders/feed/${item.id}`) */ }}
                                    onEdit={() => setEditingOrder(item)}
                                    onDelete={() => setDeletingOrderId(item.id)}
                                    onConfirm={() => setConfirmingOrderId(item.id)}
                                />
                            )}
                            contentContainerClassName="p-4 gap-2 pb-20"
                            ListEmptyComponent={renderFeedOrderEmpty}
                            refreshing={feedOrdersQuery.isFetching && !feedOrdersQuery.isLoading}
                            onRefresh={() => feedOrdersQuery.refetch()}
                        />
                    )}
                </>
            ) : activeTab === 'doc' ? (
                <>
                    {docOrdersQuery.isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="hsl(var(--primary))" />
                            <Text className='mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs'>Loading Orders...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={docOrdersQuery.data || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <DocOrderCard
                                    order={item}
                                    onEdit={() => setEditingDocOrder(item)}
                                    onDelete={() => setDeletingDocOrderId(item.id)}
                                    onConfirm={() => setConfirmingDocOrder(item)}
                                />
                            )}
                            contentContainerClassName="p-4 gap-2 pb-20"
                            ListEmptyComponent={renderDocOrderEmpty}
                            refreshing={docOrdersQuery.isFetching && !docOrdersQuery.isLoading}
                            onRefresh={() => docOrdersQuery.refetch()}
                        />
                    )}
                </>
            ) : (
                <>
                    {saleOrdersQuery.isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="hsl(var(--primary))" />
                            <Text className='mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs'>Loading Sale Orders...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={saleOrdersQuery.data || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View className="px-4">
                                    <SaleOrderCard
                                        order={item}
                                        onPress={() => { /* Handle press if needed */ }}
                                    />
                                </View>
                            )}
                            contentContainerClassName="py-4 gap-2 pb-20"
                            ListEmptyComponent={
                                <View className="flex-1 items-center justify-center p-8 mt-20 opacity-50">
                                    <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                                        <Icon as={ShoppingBag} size={24} className="text-muted-foreground" />
                                    </View>
                                    <Text className="text-xl font-black text-foreground text-center mb-2 uppercase tracking-tight">
                                        No Sale Orders
                                    </Text>
                                    <Text className="text-muted-foreground text-center text-sm font-medium">
                                        Tap the button above to create a new sale order.
                                    </Text>
                                </View>
                            }
                            refreshing={saleOrdersQuery.isFetching && !saleOrdersQuery.isLoading}
                            onRefresh={() => saleOrdersQuery.refetch()}
                        />
                    )}
                </>
            )}

            {membership?.orgId && (
                <>
                    <CreateFeedOrderModal
                        open={isCreateFeedOpen}
                        onOpenChange={setIsCreateFeedOpen}
                        orgId={membership.orgId}
                        onSuccess={() => feedOrdersQuery.refetch()}
                    />

                    {editingOrder && (
                        <CreateFeedOrderModal
                            open={!!editingOrder}
                            onOpenChange={(open) => !open && setEditingOrder(null)}
                            orgId={membership.orgId}
                            initialData={editingOrder}
                            onSuccess={() => feedOrdersQuery.refetch()}
                        />
                    )}

                    {deletingOrderId && (
                        <DeleteFeedOrderModal
                            open={!!deletingOrderId}
                            onOpenChange={(open) => !open && setDeletingOrderId(null)}
                            feedOrderId={deletingOrderId}
                            onSuccess={() => feedOrdersQuery.refetch()}
                        />
                    )}

                    {confirmingOrderId && (
                        <ConfirmFeedOrderModal
                            open={!!confirmingOrderId}
                            onOpenChange={(open) => !open && setConfirmingOrderId(null)}
                            feedOrderId={confirmingOrderId}
                            onSuccess={() => feedOrdersQuery.refetch()}
                        />
                    )}

                    {/* DOC Modals */}
                    <CreateDocOrderModal
                        open={isCreateDocOpen}
                        onOpenChange={setIsCreateDocOpen}
                        orgId={membership.orgId}
                        onSuccess={() => docOrdersQuery.refetch()}
                    />

                    {editingDocOrder && (
                        <CreateDocOrderModal
                            open={!!editingDocOrder}
                            onOpenChange={(open) => !open && setEditingDocOrder(null)}
                            orgId={membership.orgId}
                            initialData={editingDocOrder}
                            onSuccess={() => docOrdersQuery.refetch()}
                        />
                    )}

                    {deletingDocOrderId && (
                        <DeleteDocOrderModal
                            open={!!deletingDocOrderId}
                            onOpenChange={(open) => !open && setDeletingDocOrderId(null)}
                            docOrderId={deletingDocOrderId}
                            onSuccess={() => docOrdersQuery.refetch()}
                        />
                    )}

                    {confirmingDocOrder && (
                        <ConfirmDocOrderModal
                            open={!!confirmingDocOrder}
                            onOpenChange={(open) => !open && setConfirmingDocOrder(null)}
                            order={confirmingDocOrder}
                            onSuccess={() => docOrdersQuery.refetch()}
                        />
                    )}

                    {/* Sale Order Modal */}
                    <CreateSaleOrderModal
                        open={isCreateSaleOpen}
                        onOpenChange={setIsCreateSaleOpen}
                        orgId={membership.orgId}
                        onSuccess={() => saleOrdersQuery.refetch()}
                    />
                </>
            )}
        </View>
    );
}
