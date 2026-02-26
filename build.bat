@echo off
setlocal

cd /d %~dp0

if "%~1"=="" goto help
if "%~1"=="--help" goto help
if "%~1"=="--preview" goto preview
if "%~1"=="--production" goto production
if "%~1"=="--all" goto all

:help
echo Usage: build.bat [options]
echo Options:
echo   --preview     Build the preview version
echo   --production  Build the production version
echo   --all         Build both preview and production sequentially
goto end

:preview
echo Starting Preview Build...
set EXPO_PUBLIC_API_MODE=preview
set NODE_ENV=production
call npx expo prebuild --platform android
call android\gradlew.bat -p android assemblePreview
if %ERRORLEVEL% neq 0 (
    echo Preview Build Failed!
    exit /b %ERRORLEVEL%
)
echo Preview Build Completed Successfully.
goto end

:production
echo Starting Production Build...
set EXPO_PUBLIC_API_MODE=production
set NODE_ENV=production
call npx expo prebuild --platform android
call android\gradlew.bat -p android assembleRelease
if %ERRORLEVEL% neq 0 (
    echo Production Build Failed!
    exit /b %ERRORLEVEL%
)
echo Production Build Completed Successfully.
goto end

:all
call %0 --preview
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
call %0 --production
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
goto end

:end
endlocal
