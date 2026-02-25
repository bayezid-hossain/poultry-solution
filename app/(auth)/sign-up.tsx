import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    View
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
                    <Text className="text-4xl font-bold mb-2">
                        🐔 Create Account
                    </Text>
                    <Text variant="muted">
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
                    <View className="gap-1.5">
                        <Label>Full Name</Label>
                        <Input
                            placeholder="John Doe"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoComplete="name"
                        />
                    </View>

                    <View className="gap-1.5">
                        <Label>Email</Label>
                        <Input
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                        />
                    </View>

                    <View className="gap-1.5">
                        <Label>Password</Label>
                        <Input
                            placeholder="At least 8 characters"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    <View className="gap-1.5">
                        <Label>Confirm Password</Label>
                        <Input
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoComplete="new-password"
                        />
                    </View>

                    {/* Sign Up Button */}
                    <Button
                        onPress={handleSignUp}
                        disabled={loading}
                        className="rounded-xl mt-2"
                        size="lg"
                    >
                        {loading ? (
                            <ActivityIndicator color={"#ffffff"} />
                        ) : (
                            <Text className="text-primary-foreground text-base font-bold">
                                Create Account
                            </Text>
                        )}
                    </Button>

                    {/* Divider */}
                    <View className="flex-row items-center my-2">
                        <Separator className="flex-1" />
                        <Text variant="muted" className="mx-4">or</Text>
                        <Separator className="flex-1" />
                    </View>

                    {/* Google Sign Up */}
                    <Button
                        variant="outline"
                        onPress={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="rounded-xl"
                        size="lg"
                    >
                        {googleLoading ? (
                            <ActivityIndicator color={"#10b981"} />
                        ) : (
                            <>
                                <Text className="text-lg">G</Text>
                                <Text className="text-foreground text-base font-semibold">
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </Button>
                </View>

                {/* Sign In Link */}
                <View className="flex-row justify-center mt-8 gap-1">
                    <Text variant="muted" className="text-sm">
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
