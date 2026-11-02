@echo off
title Stop Takarivo Server
echo Stopping Takarivo server on port 8888...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8888" ^| findstr "LISTENING"') do (
    echo Terminating server process PID %%a...
    taskkill /F /PID %%a /T >nul 2>&1
)

echo Takarivo server stopped.
ping -n 3 127.0.0.1 >nul
exit /b 0
