import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import React from "react";
import { KeyboardAvoidingView, Modal, ModalProps, Platform, Pressable, View } from "react-native";

export interface BottomSheetModalProps extends ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    /** When true, the sheet takes up ~90% of screen height. Use for form-heavy or full-screen modals. */
    fullScreen?: boolean;
}

export function BottomSheetModal({ open, onOpenChange, children, fullScreen, ...props }: BottomSheetModalProps) {
    const isKeyboardVisible = useKeyboardVisible();

    // Use padding behavior only when keyboard is visible to prevent
    // snappy transitions when the modal closes
    const kbBehavior = isKeyboardVisible ? "padding" : undefined;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
            {...props}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? kbBehavior : kbBehavior}
                className="flex-1"
            >
                <View className="flex-1 justify-end">
                    {/* Backdrop - absolute so it doesn't interfere with content scrolling */}
                    <Pressable
                        className="absolute inset-0 bg-black/60"
                        onPress={() => onOpenChange(false)}
                    />
                    {/* Content */}
                    <View
                        className={`w-full bg-card rounded-t-[40px] overflow-hidden ${fullScreen ? 'h-[90%]' : 'max-h-[90%]'}`}
                    >
                        {children}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

