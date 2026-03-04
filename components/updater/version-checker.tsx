import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import Constants from 'expo-constants';
import * as FS from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Download, Rocket, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, View } from 'react-native';

const GITHUB_API = 'https://api.github.com/repos/bayezid-hossain/poultry-solution/releases/latest';

// Module-level state to persist across navigation/re-renders during the same app session
let hasCheckedThisSession = false;
let isDismissed = false;
let manualCheckTrigger: (() => void) | null = null;

// Discovered update info
let sessionLatestVersion = '';
let sessionReleaseNotes = '';
let sessionDownloadUrl = '';
let sessionIsVisible = false;

export const triggerManualCheck = () => {
    if (manualCheckTrigger) {
        manualCheckTrigger();
    }
};

export function VersionChecker() {
    const [currentVersion, setCurrentVersion] = useState('');
    const [isVisible, setIsVisible] = useState(sessionIsVisible);
    const [latestVersion, setLatestVersion] = useState(sessionLatestVersion);
    const [releaseNotes, setReleaseNotes] = useState(sessionReleaseNotes);
    const [downloadUrl, setDownloadUrl] = useState(sessionDownloadUrl);
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showChangelog, setShowChangelog] = useState(false);
    const [alertModal, setAlertModal] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'error' | 'success' | 'warning';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
        setAlertModal({ visible: true, title, message, type });
    };

    const checkVersion = async (isManual = false) => {
        // If we already dismissed it, don't show automatically
        if (!isManual && isDismissed) return;

        // If we already found an update this session, show it again if not dismissed
        if (!isManual && sessionIsVisible) {
            setIsVisible(true);
            return;
        }

        // If we already checked and found nothing, don't check again unless manual
        if (!isManual && hasCheckedThisSession && !sessionIsVisible) return;

        try {
            const current = Constants.expoConfig?.version || '0.0.0';
            setCurrentVersion(current);
            hasCheckedThisSession = true;
            const response = await fetch(GITHUB_API);
            const data = await response.json();

            if (!data.tag_name) return;

            const latestTag = data.tag_name.replace('v', '');
            const notes = data.body || 'Bug fixes and performance improvements.';

            // Semantic version check
            const isNewer = (latest: string, current: string) => {
                const lParts = latest.split('.').map(Number);
                const cParts = current.split('.').map(Number);
                for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
                    const l = lParts[i] || 0;
                    const c = cParts[i] || 0;
                    if (l > c) return true;
                    if (l < c) return false;
                }
                return false;
            };

            if (isNewer(latestTag, current)) {
                const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
                if (apkAsset) {
                    sessionLatestVersion = latestTag;
                    sessionReleaseNotes = notes;
                    sessionDownloadUrl = apkAsset.browser_download_url;
                    sessionIsVisible = true;

                    setLatestVersion(latestTag);
                    setReleaseNotes(notes);
                    setDownloadUrl(apkAsset.browser_download_url);
                    setIsVisible(true);
                }
            } else if (isManual) {
                showAlert("Up to Date", `You are already using the latest version (v${current}).`, 'success');
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            if (isManual) {
                showAlert("Check Failed", "Could not reach the update server. Please check your internet connection.", 'error');
            }
        }
    };

    useEffect(() => {
        manualCheckTrigger = () => checkVersion(true);
        checkVersion();
        return () => {
            manualCheckTrigger = null;
        };
    }, []);

    const handleDownload = async () => {
        if (!downloadUrl || Platform.OS !== 'android') {
            showAlert("Cannot Update", "Auto-update is only supported on Android devices downloading an APK.", 'warning');
            return;
        }

        setIsDownloading(true);
        setProgress(0);

        try {
            const fileUri = `${FS.documentDirectory}update-${latestVersion}.apk`;

            const downloadResumable = FS.createDownloadResumable(
                downloadUrl,
                fileUri,
                {},
                (downloadProgress: any) => {
                    const progressVal = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    setProgress(progressVal);
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result?.uri) {
                throw new Error("Download failed");
            }

            setProgress(1);

            // Launch Android package installer
            const contentUri = await FS.getContentUriAsync(result.uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
                type: 'application/vnd.android.package-archive',
            });

            sessionIsVisible = false;
            setIsVisible(false);
        } catch (error) {
            console.error('Download error:', error);
            showAlert('Download Failed', 'Failed to download the update. Please try again later.', 'error');
        } finally {
            setIsDownloading(false);
            setProgress(0);
        }
    };

    return (
        <>
            <Modal visible={isVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <Card className="w-full bg-card rounded-[2rem] border border-border/50 overflow-hidden">
                        <CardContent className="p-6">
                            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 self-center">
                                <Icon as={Rocket} size={32} className="text-primary" />
                            </View>

                            <Text className="text-xl font-black text-center text-foreground uppercase tracking-tight mb-2">
                                New Update Found
                            </Text>

                            <Text className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest mb-6 px-4">
                                A fresh version of Poultry Solution is ready to fuel your farm productivity.
                            </Text>

                            <View className="flex-row items-center justify-center gap-4 py-4 bg-muted/20 rounded-2xl mb-6">
                                <View className="items-center">
                                    <Text className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Current</Text>
                                    <View className="bg-background px-3 py-1 rounded-full border border-border/50">
                                        <Text className="text-xs font-black text-foreground">v{currentVersion}</Text>
                                    </View>
                                </View>

                                <Icon as={ArrowRight} size={20} className="text-muted-foreground/30" />

                                <View className="items-center">
                                    <Text className="text-[10px] uppercase font-bold text-primary mb-1">Available</Text>
                                    <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                        <Text className="text-xs font-black text-primary">v{latestVersion}</Text>
                                    </View>
                                </View>
                            </View>

                            <Button
                                variant="secondary"
                                className="flex-row items-center justify-between mb-4 px-5 h-12 rounded-2xl bg-muted/40 border-none"
                                onPress={() => setShowChangelog(!showChangelog)}
                            >
                                <Text className="text-xs font-black text-foreground uppercase tracking-tight">View Changelog</Text>
                                <Icon as={showChangelog ? ChevronUp : ChevronDown} size={18} className="text-muted-foreground" />
                            </Button>

                            {showChangelog && (
                                <View className="mb-6 p-4 bg-muted/30 rounded-2xl max-h-[140px] border border-border/30">
                                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                                        <Text className="text-xs leading-5 font-medium text-muted-foreground">
                                            {releaseNotes}
                                        </Text>
                                    </ScrollView>
                                </View>
                            )}

                            {isDownloading ? (
                                <View className="mb-4">
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-xs font-bold text-foreground">Downloading...</Text>
                                        <Text className="text-xs font-bold text-primary">{Math.round(progress * 100)}%</Text>
                                    </View>
                                    <View className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <View
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.round(progress * 100)}%` }}
                                        />
                                    </View>
                                </View>
                            ) : null}

                            <View className="gap-3">
                                <Button
                                    onPress={handleDownload}
                                    className="w-full flex-row items-center justify-center gap-2 h-14 rounded-2xl"
                                    disabled={isDownloading}
                                >
                                    <Icon as={Download} size={18} className="text-primary-foreground" />
                                    <Text className="font-black uppercase text-primary-foreground tracking-widest text-sm">
                                        {isDownloading ? 'Downloading...' : 'Update Now'}
                                    </Text>
                                </Button>

                                {!isDownloading && (
                                    <Button
                                        variant="ghost"
                                        onPress={() => {
                                            isDismissed = true;
                                            sessionIsVisible = false;
                                            setIsVisible(false);
                                        }}
                                        className="w-full h-12 rounded-2xl"
                                    >
                                        <Text className="font-bold text-muted-foreground">Remind Me Later</Text>
                                    </Button>
                                )}
                            </View>
                        </CardContent>
                    </Card>
                </View>
            </Modal>

            {/* Custom Alert/Result Modal */}
            <Modal visible={alertModal.visible} transparent animationType="fade">
                <View className="flex-1 bg-black/60 items-center justify-center p-8">
                    <Card className="w-full bg-card rounded-[2rem] border border-border/50 overflow-hidden">
                        <CardContent className="p-6 items-center">
                            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${alertModal.type === 'error' ? 'bg-destructive/10' :
                                alertModal.type === 'success' ? 'bg-primary/10' :
                                    alertModal.type === 'warning' ? 'bg-yellow-500/10' : 'bg-primary/10'
                                }`}>
                                <Icon
                                    as={
                                        alertModal.type === 'error' ? XCircle :
                                            alertModal.type === 'success' ? CheckCircle2 :
                                                alertModal.type === 'warning' ? AlertTriangle : Rocket
                                    }
                                    size={32}
                                    className={
                                        alertModal.type === 'error' ? 'text-destructive' :
                                            alertModal.type === 'success' ? 'text-primary' :
                                                alertModal.type === 'warning' ? 'text-yellow-500' : 'text-primary'
                                    }
                                />
                            </View>

                            <Text className="text-lg font-black text-center text-foreground uppercase tracking-tight mb-2">
                                {alertModal.title}
                            </Text>

                            <Text className="text-xs text-center text-muted-foreground mb-6 leading-5">
                                {alertModal.message}
                            </Text>

                            <Button
                                onPress={() => setAlertModal({ ...alertModal, visible: false })}
                                className="w-full h-12 rounded-2xl"
                            >
                                <Text className="font-bold uppercase tracking-widest text-xs">Close</Text>
                            </Button>
                        </CardContent>
                    </Card>
                </View>
            </Modal>
        </>
    );
}
