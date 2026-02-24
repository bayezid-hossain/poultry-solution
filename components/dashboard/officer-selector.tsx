import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { Check, ChevronDown, User, Users } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

export const OfficerSelector = ({ orgId }: { orgId: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { selectedOfficerId, selectedOfficerName, setSelectedOfficer } = useGlobalFilter();

    const { data: officers } = trpc.management.officers.getAll.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const handleSelect = (id: string | null, name: string) => {
        setSelectedOfficer(id, name);
        setIsOpen(false);
    };

    return (
        <>
            {/* Trigger Button */}
            <Pressable
                onPress={() => setIsOpen(true)}
                className="flex-row items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-xl active:bg-primary/20"
            >
                <Icon as={selectedOfficerId ? User : Users} size={14} color="#16a34a" />
                <Text className="text-xs font-bold text-primary" numberOfLines={1}>
                    {selectedOfficerName}
                </Text>
                <Icon as={ChevronDown} size={12} color="#16a34a" />
            </Pressable>

            {/* Selection Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    onPress={() => setIsOpen(false)}
                    className="flex-1 bg-black/60 justify-end"
                >
                    <Pressable
                        className="bg-card rounded-t-3xl pb-8 overflow-hidden border-t border-border/50"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="items-center py-4">
                            <View className="w-12 h-1.5 bg-muted rounded-full" />
                        </View>

                        <View className="px-6 pb-2">
                            <Text className="text-lg font-black text-foreground mb-1">Select Officer</Text>
                            <Text className="text-xs text-muted-foreground mb-4">
                                Filter all data by a specific officer, or view everyone's data.
                            </Text>

                            <ScrollView className="max-h-80">
                                {/* "All Officers" Option */}
                                <Pressable
                                    className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${!selectedOfficerId ? 'bg-primary/5' : ''}`}
                                    onPress={() => handleSelect(null, "All Officers")}
                                >
                                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                                        <Icon as={Users} size={20} color="#16a34a" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-foreground">All Officers</Text>
                                        <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Combined View</Text>
                                    </View>
                                    {!selectedOfficerId && (
                                        <Icon as={Check} size={20} color="#16a34a" />
                                    )}
                                </Pressable>

                                {/* Individual Officers */}
                                {officers?.map((officer: any) => (
                                    <Pressable
                                        key={officer.id}
                                        className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${selectedOfficerId === officer.id ? 'bg-primary/5' : ''}`}
                                        onPress={() => handleSelect(officer.id, officer.name)}
                                    >
                                        <View className="w-10 h-10 rounded-full bg-muted/50 items-center justify-center mr-3">
                                            <Icon as={User} size={20} color="#9ca3af" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-bold text-foreground">{officer.name}</Text>
                                            <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{officer.role}</Text>
                                        </View>
                                        {selectedOfficerId === officer.id && (
                                            <Icon as={Check} size={20} color="#16a34a" />
                                        )}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};
