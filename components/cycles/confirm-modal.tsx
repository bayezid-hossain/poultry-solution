import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AlertTriangle } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, View } from "react-native";

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
}

export function ConfirmModal({
    visible,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    destructive = false,
}: ConfirmModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
                <View className="w-[90%] bg-background rounded-3xl p-6 shadow-xl border border-border/40">

                    {/* Icon */}
                    <View className="w-14 h-14 rounded-2xl bg-destructive/10 items-center justify-center self-center mb-4">
                        <Icon
                            as={AlertTriangle}
                            size={26}
                            className={destructive ? "text-destructive" : "text-primary"}
                        />
                    </View>

                    {/* Title */}
                    <Text className="text-lg font-black text-center text-foreground">
                        {title}
                    </Text>

                    {/* Description */}
                    <Text className="text-sm text-muted-foreground text-center mt-3 leading-5">
                        {description}
                    </Text>

                    {/* Buttons */}
                    <View className="flex-row gap-3 mt-6">
                        <Pressable
                            onPress={onCancel}
                            className="flex-1 py-3 rounded-2xl bg-muted items-center justify-center"
                        >
                            <Text className="font-bold text-muted-foreground uppercase tracking-wider text-xs">
                                {cancelText}
                            </Text>
                        </Pressable>

                        <Button
                            onPress={onConfirm}
                            variant={destructive ? "destructive" : "default"}
                            className="flex-1 h-12 rounded-2xl"
                        >
                            <Text className="font-bold uppercase tracking-wider text-xs">
                                {confirmText}
                            </Text>
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}