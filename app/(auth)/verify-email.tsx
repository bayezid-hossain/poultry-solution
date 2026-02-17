import { authClient } from "@/lib/auth-client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
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
                router.replace("/(tabs)");
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
            className="flex-1 bg-slate-900"
        >
            <ScrollView
                contentContainerClassName="flex-1 justify-center px-6 py-12"
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="items-center mb-10">
                    <Text className="text-5xl mb-4">✉️</Text>
                    <Text className="text-3xl font-bold text-white mb-2">
                        Verify Your Email
                    </Text>
                    <Text className="text-base text-slate-400 text-center">
                        We sent a 6-digit code to
                    </Text>
                    <Text className="text-base text-emerald-400 font-semibold mt-1">
                        {email}
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4">
                        <Text className="text-red-300 text-sm text-center">{error}</Text>
                    </View>
                ) : null}

                {/* Resent Banner */}
                {resent ? (
                    <View className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 mb-4">
                        <Text className="text-emerald-300 text-sm text-center">
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
                            className="w-12 h-14 bg-slate-800 border border-slate-700 rounded-xl text-white text-xl text-center font-bold"
                            value={digit}
                            onChangeText={(v) => handleOtpChange(v, index)}
                            onKeyPress={({ nativeEvent: { key } }) =>
                                handleKeyPress(key, index)
                            }
                            keyboardType="number-pad"
                            maxLength={OTP_LENGTH}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {/* Verify Button */}
                <Pressable
                    onPress={handleVerify}
                    disabled={loading}
                    className="bg-emerald-500 rounded-xl py-4 items-center active:bg-emerald-600"
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white text-base font-bold">
                            Verify Email
                        </Text>
                    )}
                </Pressable>

                {/* Resend */}
                <View className="items-center mt-6">
                    <Text className="text-slate-400 text-sm mb-2">
                        Didn&apos;t receive the code?
                    </Text>
                    <Pressable onPress={handleResend} disabled={resending}>
                        {resending ? (
                            <ActivityIndicator size="small" color="#34d399" />
                        ) : (
                            <Text className="text-emerald-400 text-sm font-bold">
                                Resend Code
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
