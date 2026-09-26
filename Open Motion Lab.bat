@echo off
rem The motion lab (D-42): hit a zombie or the marine, watch it react, and leave a note for the crew.
rem Needs Node (the crew panel uses it too). Notes land in review\motion-*\notes.md.
cd /d "%~dp0"
set PORT=8972
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
start "Dead-Wave Motion Lab" /D "%~dp0" /min node tools\serve.mjs %PORT%
ping 127.0.0.1 -n 2 >nul
start "" "http://127.0.0.1:%PORT%/studio/motion-lab.html"
