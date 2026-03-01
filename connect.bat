@echo off
set "ADB_EXE=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

set DEVICE_ADDRESS=192.168.0.202:42583

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
