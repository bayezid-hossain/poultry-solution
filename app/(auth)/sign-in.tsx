import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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

export default function SignInScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleSignIn = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const result = await authClient.signIn.email({
                email: email.trim().toLowerCase(),
                password,
            });
            if (result.error) {
                setError(result.error.message ?? "Sign in failed. Please try again.");
            } else {
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            setError(e?.message ?? "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setGoogleLoading(true);
        try {
            const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: "/(tabs)",
            });
            if (result?.error) {
                setError(result.error.message ?? "Google sign-in failed.");
                setGoogleLoading(false);
            }
        } catch (e: any) {
            setError(e?.message ?? "Google sign-in failed.");
            setGoogleLoading(false);
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
                    <Text className="text-4xl font-bold text-white mb-2">
                        🐔 Poultry Solution
                    </Text>
                    <Text className="text-base text-slate-400">
                        Sign in to your account
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4">
                        <Text className="text-red-300 text-sm text-center">{error}</Text>
                    </View>
                ) : null}

                {/* Form */}
                <View className="gap-4">
                    <View>
                        <Text className="text-slate-300 text-sm font-medium mb-1.5 ml-1">
                            Email
                        </Text>
                        <TextInput
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base"
                            placeholder="you@example.com"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                        />
                    </View>

                    <View>
                        <Text className="text-slate-300 text-sm font-medium mb-1.5 ml-1">
                            Password
                        </Text>
                        <TextInput
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base"
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                        />
                    </View>

                    {/* Forgot Password Link */}
                    <View className="items-end">
                        <Link href="/(auth)/forgot-password" asChild>
                            <Pressable>
                                <Text className="text-emerald-400 text-sm font-medium">
                                    Forgot password?
                                </Text>
                            </Pressable>
                        </Link>
                    </View>

                    {/* Sign In Button */}
                    <Pressable
                        onPress={handleSignIn}
                        disabled={loading}
                        className="bg-emerald-500 rounded-xl py-4 items-center mt-2 active:bg-emerald-600"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-base font-bold">Sign In</Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View className="flex-row items-center my-2">
                        <View className="flex-1 h-px bg-slate-700" />
                        <Text className="text-slate-500 text-sm mx-4">or</Text>
                        <View className="flex-1 h-px bg-slate-700" />
                    </View>

                    {/* Google Sign In */}
                    <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="bg-white rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-gray-100"
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#333" />
                        ) : (
                            <>
                                <Text className="text-lg">G</Text>
                                <Text className="text-gray-800 text-base font-semibold">
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>

                {/* Sign Up Link */}
                <View className="flex-row justify-center mt-8 gap-1">
                    <Text className="text-slate-400 text-sm">
                        Don&apos;t have an account?
                    </Text>
                    <Link href="/(auth)/sign-up" asChild>
                        <Pressable>
                            <Text className="text-emerald-400 text-sm font-bold">
                                Sign Up
                            </Text>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
