import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Filter, Globe, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";

export interface OfficerSelectorProps {
    orgId?: string;
    onOfficerChange?: (officerId: string | null) => void;
    disableGlobal?: boolean;
}

export function OfficerSelector({ orgId, onOfficerChange, disableGlobal = false }: OfficerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);
    const { selectedOfficerId, selectedOfficerName, setSelectedOfficer } = useGlobalFilter();

    const { data: officers } = trpc.management.officers.getAll.useQuery(
        { orgId: orgId ?? "" },
        { enabled: !!orgId }
    );

    const handleSelect = (id: string | null, name: string) => {
        setSelectedOfficer(id, name);
        setIsOpen(false);
        setSearchQuery("");
        if (onOfficerChange) {
            onOfficerChange(id);
        }
    };

    const filteredOfficers = useMemo(() => {
        if (!officers) return [];
        return officers.filter((o: any) =>
            o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [officers, searchQuery]);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-rose-500', 'bg-emerald-500'];
    const getAvatarColor = (id: string) => {
        const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    return (
        <>
            {/* Trigger Button */}
            <Pressable
                onPress={() => setIsOpen(true)}
                className="flex-row items-center gap-2 bg-muted/40 border border-border/50 px-4 py-2.5 rounded-full active:bg-muted/60"
            >
                <View className="w-5 h-5 rounded-full bg-primary/10 items-center justify-center">
                    <Icon as={Filter} size={10} className="text-primary" />
                </View>
                <Text className="text-xs font-black text-foreground/80 tracking-tight" numberOfLines={1}>
                    {selectedOfficerId ? selectedOfficerName : "All Officers"}
                </Text>
                <View className="w-4 h-4 rounded-full bg-foreground/5 items-center justify-center">
                    <Icon as={ChevronDown} size={10} className="text-muted-foreground" />
                </View>
            </Pressable>

            {/* Selection Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="slide"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setIsOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1 }}
                    enabled={Platform.OS === 'ios' ? true : isKeyboardVisible}
                >
                    <View className="flex-1 bg-black/40 justify-end">
                        <Pressable className="flex-1" onPress={() => setIsOpen(false)} />
                        <View
                            className="bg-card rounded-t-[2.5rem] border-t border-border/50 max-h-[90%]"
                            style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: -10 },
                                shadowOpacity: 0.1,
                                shadowRadius: 20,
                                elevation: 20
                            }}
                        >
                            {/* Drawer Handle */}
                            <View className="items-center py-4">
                                <View className="w-12 h-1.5 bg-muted/40 rounded-full" />
                            </View>

                            <View className="px-6 pb-10">
                                <View className="flex-row items-center justify-between mb-2">
                                    <View>
                                        <Text className="text-2xl font-black text-foreground tracking-tight">Select Officer</Text>
                                        <Text className="text-xs text-muted-foreground font-medium">Filtering data across organization</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setIsOpen(false)}
                                        className="w-10 h-10 rounded-full bg-muted/50 items-center justify-center active:bg-muted"
                                    >
                                        <Icon as={X} size={20} className="text-muted-foreground" />
                                    </Pressable>
                                </View>

                                {/* Search Bar */}
                                <View className="relative mt-4 mb-6">
                                    <View className="absolute left-4 top-1/2 -mt-2 z-10">
                                        <Icon as={Search} size={16} className="text-muted-foreground/60" />
                                    </View>
                                    <TextInput
                                        placeholder="Search by name or role..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholderTextColor="#94a3b8"
                                        className="h-14 bg-muted/30 rounded-2xl pl-12 pr-4 text-foreground font-bold border border-border/30"
                                    />
                                </View>

                                <ScrollView
                                    className="mb-4"
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* "All Officers" Option */}
                                    {!disableGlobal && !searchQuery && (
                                        <Pressable
                                            onPress={() => handleSelect(null, "All Officers")}
                                            className={`p-4 rounded-2xl mb-3 flex-row items-center justify-between border ${!selectedOfficerId
                                                ? 'bg-primary/10 border-primary/20'
                                                : 'bg-muted/20 border-border/50'
                                                }`}
                                        >
                                            <View className="flex-row items-center gap-4">
                                                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${!selectedOfficerId ? 'bg-primary/20' : 'bg-muted/40'
                                                    }`}>
                                                    <Icon as={Globe} size={24} className={!selectedOfficerId ? 'text-primary' : 'text-muted-foreground'} />
                                                </View>
                                                <View>
                                                    <Text className={`font-black text-base ${!selectedOfficerId ? 'text-primary' : 'text-foreground'}`}>All Officers</Text>
                                                    <Text className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Global View</Text>
                                                </View>
                                            </View>
                                            {!selectedOfficerId && (
                                                <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                                                    <View className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                </View>
                                            )}
                                        </Pressable>
                                    )}

                                    {/* Individual Officers */}
                                    <View className="gap-3">
                                        {filteredOfficers.map((officer: any) => {
                                            const isActive = selectedOfficerId === officer.id;
                                            return (
                                                <Pressable
                                                    key={officer.id}
                                                    className={`flex-row items-center p-4 rounded-2xl border active:opacity-80 ${isActive
                                                        ? 'bg-primary/10 border-primary/20'
                                                        : 'bg-muted/20 border-border/30'
                                                        }`}
                                                    onPress={() => handleSelect(officer.id, officer.name)}
                                                >
                                                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${getAvatarColor(officer.id)}`}>
                                                        <Text className="text-white font-black text-sm">{getInitials(officer.name)}</Text>
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className={`text-base font-black ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                            {officer.name}
                                                        </Text>
                                                        <View className="flex-row items-center gap-1.5 mt-0.5">
                                                            <View className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary/60' : 'bg-muted-foreground/30'}`} />
                                                            <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                                                {officer.role}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {isActive && (
                                                        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                                                            <View className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                        </View>
                                                    )}
                                                </Pressable>
                                            );
                                        })}

                                        {filteredOfficers.length === 0 && (
                                            <View className="py-20 items-center">
                                                <View className="w-16 h-16 rounded-full bg-muted/20 items-center justify-center mb-4">
                                                    <Icon as={Search} size={24} className="text-muted-foreground/40" />
                                                </View>
                                                <Text className="text-muted-foreground font-black uppercase tracking-tight text-xs">No officers found</Text>
                                            </View>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}
