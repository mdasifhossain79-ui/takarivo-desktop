@echo off
set SCRIPT_DIR=%~dp0
echo Creating Takarivo Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%create-shortcut.ps1"
echo.
pause
