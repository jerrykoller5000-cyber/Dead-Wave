@echo off
rem CL-148: opens the Z-Sounds Check page (z-sounds\listen.html): which zombie sound folders have takes, and how they
rem sound in the game. Uses the game's own server (the one "Play Dead-Wave.bat" starts); starts it if it isn't running.
cd /d "%~dp0"
set PORT=8766
netstat -ano | findstr ":%PORT% .*LISTENING" >nul
if %errorlevel%==0 goto open
where py >nul 2>&1
if %errorlevel%==0 (
    start "Grave Shift Server" /D "%~dp0" /min py "%~dp0tools\serve.py" %PORT%
) else (
    start "Grave Shift Server" /D "%~dp0" /min python "%~dp0tools\serve.py" %PORT%
)
ping 127.0.0.1 -n 3 >nul
:open
start "" "http://127.0.0.1:%PORT%/z-sounds/listen.html"
exit
