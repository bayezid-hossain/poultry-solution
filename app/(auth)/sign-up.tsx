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

export default function SignUpScreen() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setError("");
        setGoogleLoading(true);
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/(tabs)",
            });
        } catch (e: any) {
            setError(e?.message ?? "Google sign-in failed.");
            setGoogleLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const result = await authClient.signUp.email({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
            });
            if (result.error) {
                setError(result.error.message ?? "Sign up failed. Please try again.");
            } else {
                // Navigate to email verification
                router.replace({
                    pathname: "/(auth)/verify-email",
                    params: { email: email.trim().toLowerCase() },
                });
            }
        } catch (e: any) {
            setError(e?.message ?? "An unexpected error occurred.");
        } finally {
            setLoading(false);
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
                    <Text className="text-4xl font-bold text-foreground mb-2">
                        🐔 Create Account
                    </Text>
                    <Text className="text-base text-muted-foreground">
                        Join Poultry Solution
                    </Text>
                </View>

                {/* Error Banner */}
                {error ? (
                    <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
                        <Text className="text-destructive text-sm text-center">{error}</Text>
                    </View>
                ) : null}

                {/* Form */}
                <View className="gap-4">
                    <View>
                        <Text className="text-foreground text-sm font-medium mb-1.5 ml-1">
                            Full Name
                        </Text>
                        <TextInput
                            className="bg-card border border-input rounded-xl px-4 py-3.5 text-foreground text-base"
                            placeholder="John Doe"
                            placeholderTextColor="hsl(var(--muted-foreground))"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoComplete="name"
                        />
                    </View>

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

                    <View>
                        <Text className="text-foreground text-sm font-medium mb-1.5 ml-1">
                            Password
                        </Text>
                        <TextInput
                            className="bg-card border border-input rounded-xl px-4 py-3.5 text-foreground text-base"
                            placeholder="At least 8 characters"
                            placeholderTextColor="hsl(var(--muted-foreground))"
                            value={password}
                            onChangeText={setPassword}
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

                    {/* Sign Up Button */}
                    <Pressable
                        onPress={handleSignUp}
                        disabled={loading}
                        className="bg-primary rounded-xl py-4 items-center mt-2 active:opacity-90"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-primary-foreground text-base font-bold">
                                Create Account
                            </Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View className="flex-row items-center my-2">
                        <View className="flex-1 h-px bg-border" />
                        <Text className="text-muted-foreground text-sm mx-4">or</Text>
                        <View className="flex-1 h-px bg-border" />
                    </View>

                    {/* Google Sign Up */}
                    <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="bg-card border border-input rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-secondary"
                    >
                        {googleLoading ? (
                            <ActivityIndicator color="#333" />
                        ) : (
                            <>
                                <Text className="text-lg text-foreground">G</Text>
                                <Text className="text-foreground text-base font-semibold">
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-8 gap-1">
                    <Text className="text-muted-foreground text-sm">
                        Already have an account?
                    </Text>
                    <Link href="/(auth)/sign-in" asChild>
                        <Pressable>
                            <Text className="text-primary text-sm font-bold">
                                Sign In
                            </Text>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
