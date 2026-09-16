@echo off
cd /d "%~dp0"
set PORT=8766
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
start "Tiny Trek Server" /D "%~dp0" /min C:\Windows\py.exe -m http.server %PORT%
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:%PORT%/index.html?pistol=1"
exit
