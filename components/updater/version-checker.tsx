import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import Constants from 'expo-constants';
import * as FS from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { AlertTriangle, Download } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, View } from 'react-native';

const GITHUB_API = 'https://api.github.com/repos/bayezid-hossain/poultry-solution/releases/latest';

export function VersionChecker() {
    const [isVisible, setIsVisible] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const checkVersion = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '0.0.0';
            const response = await fetch(GITHUB_API);
            const data = await response.json();

            if (!data.tag_name) return;

            const latestTag = data.tag_name.replace('v', '');
            const notes = data.body || 'Bug fixes and performance improvements.';

            // Basic semver check
            if (latestTag > currentVersion) {
                const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
                if (apkAsset) {
                    setLatestVersion(latestTag);
                    setReleaseNotes(notes);
                    setDownloadUrl(apkAsset.browser_download_url);
                    setIsVisible(true);
                }
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    };

    useEffect(() => {
        checkVersion();
    }, []);

    const handleDownload = async () => {
        if (!downloadUrl || Platform.OS !== 'android') {
            Alert.alert("Cannot Update", "Auto-update is only supported on Android devices downloading an APK.");
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

            setIsVisible(false);
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Download Failed', 'Failed to download the update. Please try again later.');
        } finally {
            setIsDownloading(false);
            setProgress(0);
        }
    };

    return (
        <Modal visible={isVisible} transparent animationType="slide">
            <View className="flex-1 bg-black/60 items-center justify-center p-6">
                <Card className="w-full bg-card rounded-[2rem] border border-border/50 overflow-hidden">
                    <CardContent className="p-6">
                        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 self-center">
                            <Icon as={AlertTriangle} size={32} className="text-primary" />
                        </View>

                        <Text className="text-xl font-black text-center text-foreground uppercase tracking-tight mb-2">
                            Update Available
                        </Text>

                        <Text className="text-sm text-center text-muted-foreground mb-6">
                            Version {latestVersion} is ready to install.
                        </Text>

                        <View className="bg-muted/30 p-4 rounded-2xl mb-6">
                            <Text className="text-xs font-bold text-foreground mb-2 uppercase tracking-tight">Release Notes</Text>
                            <Text className="text-xs text-muted-foreground" numberOfLines={4}>
                                {releaseNotes}
                            </Text>
                        </View>

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
                                    onPress={() => setIsVisible(false)}
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
    );
}
