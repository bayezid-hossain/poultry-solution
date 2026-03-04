import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import React from "react";
import { KeyboardAvoidingView, Modal, ModalProps, Platform, Pressable } from "react-native";

export interface BottomSheetModalProps extends ModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function BottomSheetModal({ open, onOpenChange, children, ...props }: BottomSheetModalProps) {
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
                <Pressable
                    className="flex-1 bg-black/60 justify-end"
                    onPress={() => onOpenChange(false)}
                >
                    <Pressable
                        className="w-full bg-card rounded-t-[40px] overflow-hidden max-h-[90%]"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {children}
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}
