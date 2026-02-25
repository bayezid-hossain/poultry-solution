@echo off
set EXPO_PUBLIC_API_MODE=preview
set NODE_ENV=production
cd /d %~dp0
call npx expo export --platform android
call android\gradlew.bat -p android assemblePreview