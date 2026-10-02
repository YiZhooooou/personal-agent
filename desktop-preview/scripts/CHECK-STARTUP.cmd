@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0Check-Startup.ps1"
echo.
echo If script execution is blocked, leave your policy unchanged and open Personal Agent Preview.exe normally.
pause
