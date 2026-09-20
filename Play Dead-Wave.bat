@echo off
cd /d "%~dp0"
set PORT=8766
set "URL=http://127.0.0.1:%PORT%/index.html?solid=1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
where py >nul 2>&1
if %errorlevel%==0 (
    start "Dead-Wave Server" /D "%~dp0" /min py -m http.server %PORT%
) else (
    start "Dead-Wave Server" /D "%~dp0" /min python -m http.server %PORT%
)
ping 127.0.0.1 -n 3 >nul

rem Laptops with integrated + NVIDIA/AMD graphics run browsers on the weak integrated
rem chip unless told otherwise (measured: ~3x slower). The game gets its own Edge window
rem and profile so the high-performance GPU flag applies even when Edge is already open.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" goto defaultbrowser
start "" "%EDGE%" --user-data-dir="%LOCALAPPDATA%\TinyTrek\Browser" --no-first-run --no-default-browser-check --force_high_performance_gpu --start-maximized --app="%URL%"
exit

:defaultbrowser
start "" "%URL%"
exit
