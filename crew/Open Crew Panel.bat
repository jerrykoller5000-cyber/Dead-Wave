@echo off
rem Opens the crew panel: a live view of crew/BOARD.md, crew/status/ and crew/LOG.md.
rem It starts a small local server for the game folder (if one is not already running on
rem the port) and opens the panel in your browser. Close the server window to stop it.
cd /d "%~dp0.."
set PORT=8972
set "URL=http://127.0.0.1:%PORT%/crew/panel.html"
netstat -ano | findstr ":%PORT% .*LISTENING" >nul
if %errorlevel%==0 goto open

where node >nul 2>&1
if %errorlevel%==0 goto usenode
where py >nul 2>&1
if %errorlevel%==0 goto usepy
start "Dead-Wave Crew Panel server" /min python -m http.server %PORT% --bind 127.0.0.1
goto wait
:usenode
start "Dead-Wave Crew Panel server" /min node tools/serve.mjs %PORT%
goto wait
:usepy
start "Dead-Wave Crew Panel server" /min py -m http.server %PORT% --bind 127.0.0.1
:wait
ping 127.0.0.1 -n 3 >nul

:open
start "" "%URL%"
exit
