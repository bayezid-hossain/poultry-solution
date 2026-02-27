import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Eye, FileText, Share2, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';

interface ExportPreviewDialogProps {
    visible: boolean;
    onClose: () => void;
    onView: () => void;
    onShare: () => void;
    title: string;
    type: 'pdf' | 'excel';
}

export function ExportPreviewDialog({ visible, onClose, onView, onShare, title, type }: ExportPreviewDialogProps) {
    const isPdf = type === 'pdf';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 items-center justify-center p-6">
                <View className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 shadow-2xl">
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-6">
                        <View className="flex-1 mr-4">
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${isPdf ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                                <Icon as={FileText} size={24} className={isPdf ? 'text-destructive' : 'text-emerald-600'} />
                            </View>
                            <Text className="text-xl font-black text-foreground leading-tight">Report Ready</Text>
                            <Text className="text-xs text-muted-foreground mt-1" numberOfLines={2}>{title}</Text>
                        </View>
                        <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-muted/50 items-center justify-center active:bg-muted">
                            <Icon as={X} size={16} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    {/* Actions */}
                    <View className="gap-3">
                        <Button
                            onPress={onView}
                            variant="default"
                            className="h-14 rounded-2xl flex-row items-center justify-center gap-3"
                        >
                            <Icon as={Eye} size={18} className="text-primary-foreground" />
                            <Text className="text-sm font-bold text-primary-foreground" numberOfLines={1}>View Report</Text>
                        </Button>

                        <Button
                            onPress={onShare}
                            variant="secondary"
                            className="h-14 rounded-2xl flex-row items-center justify-center gap-3 border border-border/50"
                        >
                            <Icon as={Share2} size={18} className="text-foreground" />
                            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>Share / Export</Text>
                        </Button>
                    </View>

                    <Text className="text-[10px] text-center text-muted-foreground mt-6 opacity-50 font-medium italic">
                        The report has been generated and saved locally.
                    </Text>
                </View>
            </View>
        </Modal>
    );
}
