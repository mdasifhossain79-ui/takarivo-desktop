@echo off
setlocal enabledelayedexpansion
title Takarivo Personal Banking

:: Always run in the project directory
cd /d "%~dp0"

:: Ensure Node and npm are reachable
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [ERROR] Node.js was not found on your computer!
        echo Please make sure Node.js is installed to run Takarivo.
        echo.
        pause
        exit /b 1
    )
)

:: Check if Takarivo server is already running on port 8888
netstat -ano | findstr ":8888" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo   Starting Takarivo Personal Banking...
    echo ========================================================
    echo.
    echo Starting local server in background...
    
    :: Launch npm run dev in a minimized window that stays running
    start "Takarivo Server" /min cmd /k "cd /d ""%~dp0"" && npm run dev"
    
    :: Wait and poll until server is actively listening on port 8888 (up to 35 seconds)
    set /a RETRIES=0
    :WAIT_LOOP
    ping -n 2 127.0.0.1 >nul
    set /a RETRIES+=1
    netstat -ano | findstr ":8888" | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Server ready!
        goto LAUNCH_APP
    )
    if !RETRIES! geq 35 (
        echo.
        echo [ERROR] Server took too long to start on port 8888.
        echo Please check the minimized "Takarivo Server" window for details.
        echo.
        pause
        exit /b 1
    )
    echo Initializing services... [!RETRIES!/35]
    goto WAIT_LOOP
)

:LAUNCH_APP
:: Locate Microsoft Edge or Google Chrome to launch in desktop app mode (--app)
set "BROWSER_EXE="

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    goto OPEN_WINDOW
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    goto OPEN_WINDOW
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    goto OPEN_WINDOW
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    goto OPEN_WINDOW
)
if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
    goto OPEN_WINDOW
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
    goto OPEN_WINDOW
)

:OPEN_WINDOW
if defined BROWSER_EXE (
    start "" "!BROWSER_EXE!" --app=http://localhost:8888
) else (
    start http://localhost:8888
)

exit /b 0
