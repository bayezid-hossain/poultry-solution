set EXPO_PUBLIC_API_MODE=preview
npx expo export --platform android
cd android
.\gradlew assemblePreview