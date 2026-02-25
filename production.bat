set EXPO_PUBLIC_API_MODE=production
npx expo export --platform android
cd android
.\gradlew assembleRelease