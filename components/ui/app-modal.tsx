import React from 'react';
import { Modal, ModalProps, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';

/**
 * A wrapper around React Native's Modal that ensures toasts can be displayed
 * on top of the modal on Android.
 * 
 * Why? Android renders `Modal` in a completely separate native window that sits
 * above the root React Native view hierarchy. Therefore, a global `<Toaster />` 
 * in `app/_layout.tsx` is drawn underneath the Modal and is invisible.
 * On iOS, `FullWindowOverlay` in the root layout is sufficient.
 * 
 * By wrapping the modal content in `GestureHandlerRootView` and adding a 
 * local `<Toaster />` here specifically for Android, we guarantee toasts are visible.
 */
export function AppModal({ children, ...props }: ModalProps) {
    return (
        <Modal {...props}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                {children}
                {Platform.OS === 'android' && (
                    <Toaster position="bottom-center" offset={40} />
                )}
            </GestureHandlerRootView>
        </Modal>
    );
}
