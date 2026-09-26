@echo off
rem The model lab (docs/studio.md, models): turn round a prop or a creature, see its cost, hit a creature
rem that has a body, and leave a note for the crew with a picture. Needs Node (the crew panel uses it too).
rem Notes land in review\model-*\notes.md. Its own port, so the motion lab can stay open beside it.
cd /d "%~dp0"
set PORT=8973
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
start "Dead-Wave Model Lab" /D "%~dp0" /min node tools\serve.mjs %PORT%
ping 127.0.0.1 -n 2 >nul
start "" "http://127.0.0.1:%PORT%/studio/model-lab.html"
