import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "expo-router";
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

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [step, setStep] = useState<"email" | "otp">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleSendOtp = async () => {
        if (!email) {
            setError("Please enter your email address.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await authClient.emailOtp.sendVerificationOtp({
                email: email.trim().toLowerCase(),
                type: "forget-password",
            });
            setStep("otp");
        } catch (e: any) {
            setError(e?.message ?? "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
            const newOtpArr = [...otp];
            digits.forEach((d, i) => {
                if (index + i < OTP_LENGTH) newOtpArr[index + i] = d;
            });
            setOtp(newOtpArr);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            inputRefs.current[nextIndex]?.focus();
            return;
        }
        const newOtpArr = [...otp];
        newOtpArr[index] = value.replace(/\D/g, "");
        setOtp(newOtpArr);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResetPassword = async () => {
        const code = otp.join("");
        if (code.length !== OTP_LENGTH) {
            setError("Please enter the complete verification code.");
            return;
        }
        if (!newPassword) {
            setError("Please enter a new password.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const result = await authClient.emailOtp.resetPassword({
                email: email.trim().toLowerCase(),
                otp: code,
                password: newPassword,
            });
            if (result.error) {
                setError(result.error.message ?? "Reset failed. Check your code and try again.");
            } else {
                // Password reset successful — go to sign in
                router.replace("/(auth)/sign-in");
            }
        } catch (e: any) {
            setError(e?.message ?? "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await authClient.emailOtp.sendVerificationOtp({
                email: email.trim().toLowerCase(),
                type: "forget-password",
            });
            setOtp(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } catch {
            setError("Failed to resend code.");
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
                    <Text className="text-5xl mb-4">🔐</Text>
                    <Text className="text-3xl font-bold text-foreground mb-2">
                        {step === "email" ? "Forgot Password?" : "Reset Password"}
                    </Text>
                    <Text className="text-base text-muted-foreground text-center">
                        {step === "email"
                            ? "Enter your email and we'll send you a verification code."
                            : `Enter the code sent to ${email} and set a new password.`}
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                        <Text className="text-destructive text-sm text-center">{error}</Text>
                    </View>
                ) : null}

                {step === "email" ? (
                    /* Step 1: Email */
                    <View className="gap-4">
                        <View>
                            <Text className="text-foreground text-sm font-medium mb-1.5 ml-1">
                                Email
                            </Text>
                            <TextInput
                                className="bg-card border border-input rounded-xl px-4 py-3.5 text-foreground text-base"
                                placeholder="you@example.com"
                                placeholderTextColor="hsl(var(--muted-foreground))"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect={false}
                            />
                        </View>

                        <Pressable
                            onPress={handleSendOtp}
                            disabled={loading}
                            className="bg-primary rounded-xl py-4 items-center mt-2 active:opacity-90"
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-primary-foreground text-base font-bold">
                                    Send Verification Code
                                </Text>
                            )}
                        </Pressable>

                        <View className="items-center mt-4">
                            <Link href="/(auth)/sign-in" asChild>
                                <Pressable>
                                    <Text className="text-primary text-sm font-bold">
                                        ← Back to Sign In
                                    </Text>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                ) : (
                    /* Step 2: OTP + New Password */
                    <View className="gap-4">
                        {/* OTP Inputs */}
                        <View className="flex-row justify-center gap-3 mb-2">
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
                                    maxLength={OTP_LENGTH}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        <View>
                            <Text className="text-foreground text-sm font-medium mb-1.5 ml-1">
                                New Password
                            </Text>
                            <TextInput
                                className="bg-card border border-input rounded-xl px-4 py-3.5 text-foreground text-base"
                                placeholder="At least 8 characters"
                                placeholderTextColor="hsl(var(--muted-foreground))"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                autoComplete="new-password"
                            />
                        </View>

                        <View>
                            <Text className="text-foreground text-sm font-medium mb-1.5 ml-1">
                                Confirm Password
                            </Text>
                            <TextInput
                                className="bg-card border border-input rounded-xl px-4 py-3.5 text-foreground text-base"
                                placeholder="Re-enter your password"
                                placeholderTextColor="hsl(var(--muted-foreground))"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoComplete="new-password"
                            />
                        </View>

                        <Pressable
                            onPress={handleResetPassword}
                            disabled={loading}
                            className="bg-primary rounded-xl py-4 items-center mt-2 active:opacity-90"
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-primary-foreground text-base font-bold">
                                    Reset Password
                                </Text>
                            )}
                        </Pressable>

                        {/* Resend */}
                        <View className="items-center mt-2">
                            <Pressable onPress={handleResend} disabled={resending}>
                                {resending ? (
                                    <ActivityIndicator size="small" className="text-primary" />
                                ) : (
                                    <Text className="text-primary text-sm font-bold">
                                        Resend Code
                                    </Text>
                                )}
                            </Pressable>
                        </View>

                        <View className="items-center mt-2">
                            <Pressable onPress={() => { setStep("email"); setError(""); }}>
                                <Text className="text-muted-foreground text-sm">
                                    ← Change email
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
