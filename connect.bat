@echo off
set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

set DEFAULT_ADDRESS=192.168.0.204:39135
set /p "DEVICE_ADDRESS=Enter Device Address [Default: %DEFAULT_ADDRESS%]: "
if "%DEVICE_ADDRESS%" == "" set "DEVICE_ADDRESS=%DEFAULT_ADDRESS%"

if "%1" == "--pair" (
    echo Pairing with %DEVICE_ADDRESS%...
    "%ADB_EXE%" pair %DEVICE_ADDRESS%
    if %errorlevel% neq 0 (
        echo Pairing failed.
        pause
        exit /b %errorlevel%
    )
    echo Pairing successful.
)

echo Starting ADB Connection to %DEVICE_ADDRESS%...

:: kill-server if needed
"%ADB_EXE%" kill-server
"%ADB_EXE%" start-server

echo Attempting to connect...
"%ADB_EXE%" connect %DEVICE_ADDRESS%

echo.
echo Current Devices:
"%ADB_EXE%" devices
echo.

pause
