import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from "react-native";

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const router = useRouter();
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste — spread digits across inputs
            const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
            const newOtp = [...otp];
            digits.forEach((d, i) => {
                if (index + i < OTP_LENGTH) newOtp[index + i] = d;
            });
            setOtp(newOtp);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, "");
        setOtp(newOtp);

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join("");
        if (code.length !== OTP_LENGTH) {
            setError("Please enter the complete verification code.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const result = await authClient.emailOtp.verifyEmail({
                email: email ?? "",
                otp: code,
            });
            if (result.error) {
                setError(
                    result.error.message ?? "Verification failed. Please try again."
                );
            } else {
                router.replace("/");
            }
        } catch (e: any) {
            setError(e?.message ?? "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        setResent(false);
        try {
            await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification",
            });
            setResent(true);
            setOtp(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } catch {
            setError("Failed to resend code. Please try again.");
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-background"
        >
            <ScrollView
                contentContainerClassName="flex-1 justify-center px-6 py-12"
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="items-center mb-10">
                    <Text className="text-5xl mb-4">✉️</Text>
                    <Text className="text-3xl font-bold mb-2">
                        Verify Your Email
                    </Text>
                    <Text variant="muted" className="text-base text-center">
                        We sent a 6-digit code to
                    </Text>
                    <Text className="text-base text-primary font-semibold mt-1">
                        {email}
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                        <Text className="text-destructive text-sm text-center">{error}</Text>
                    </View>
                ) : null}

                {/* Resent Banner */}
                {resent ? (
                    <View className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
                        <Text className="text-primary text-sm text-center">
                            New code sent! Check your inbox.
                        </Text>
                    </View>
                ) : null}

                {/* OTP Inputs */}
                <View className="flex-row justify-center gap-3 mb-6">
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => {
                                inputRefs.current[index] = ref;
                            }}
                            className="w-12 h-14 bg-card border border-input rounded-xl text-foreground text-xl text-center font-bold"
                            value={digit}
                            onChangeText={(v) => handleOtpChange(v, index)}
                            onKeyPress={({ nativeEvent: { key } }) =>
                                handleKeyPress(key, index)
                            }
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {/* Verify Button */}
                <Button
                    onPress={handleVerify}
                    disabled={loading}
                    className="rounded-xl"
                    size="lg"
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text className="text-primary-foreground text-base font-bold">
                            Verify Email
                        </Text>
                    )}
                </Button>

                {/* Resend */}
                <View className="items-center mt-6">
                    <Text variant="muted" className="text-sm mb-2">
                        Didn&apos;t receive the code?
                    </Text>
                    <Pressable onPress={handleResend} disabled={resending}>
                        {resending ? (
                            <ActivityIndicator color="#10b981" />
                        ) : (
                            <Text className="text-primary text-sm font-bold">
                                Resend Code
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
