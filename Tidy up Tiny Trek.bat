@echo off
rem CL-162 (Claude, 2026-10-10): Jerry asked for the Tiny Trek folder to be cleaned up.
rem This MOVES leftovers into "_DELETE ME" (it deletes nothing). Look in there, then delete that one folder.
rem Only scratch files nothing uses: test pages, a crash dump, an empty folder, and Claude's old pictures.
rem Running it twice is harmless. When it has run, this file removes itself.
setlocal
cd /d "%~dp0"
set "BIN=_DELETE ME"
if not exist "%BIN%\Claude outputs" mkdir "%BIN%\Claude outputs"
set /a N=0
call :mv ".tmp-demon-turns-before.html" "%BIN%\.tmp-demon-turns-before.html"
call :mv ".tmp-zombie-abilities-base.html" "%BIN%\.tmp-zombie-abilities-base.html"
call :mv ".tmp-zombie-abilities-perf-off.html" "%BIN%\.tmp-zombie-abilities-perf-off.html"
call :mv ".tmp-zombie-abilities-perf-on.html" "%BIN%\.tmp-zombie-abilities-perf-on.html"
call :mv ".tmp-zombie-abilities.html" "%BIN%\.tmp-zombie-abilities.html"
call :mv ".tmp-zombie-audio-GP-178" "%BIN%\.tmp-zombie-audio-GP-178"
call :mv "bash.exe.stackdump" "%BIN%\bash.exe.stackdump"
call :mv "x" "%BIN%\x"
call :mv "Claude outputs\aircraft-in-game-1.jpg" "%BIN%\Claude outputs\aircraft-in-game-1.jpg"
call :mv "Claude outputs\aircraft-in-game.jpg" "%BIN%\Claude outputs\aircraft-in-game.jpg"
call :mv "Claude outputs\armory-1280x720-after-1.png" "%BIN%\Claude outputs\armory-1280x720-after-1.png"
call :mv "Claude outputs\armory-1280x720-after.png" "%BIN%\Claude outputs\armory-1280x720-after.png"
call :mv "Claude outputs\armory-1280x720-before.png" "%BIN%\Claude outputs\armory-1280x720-before.png"
call :mv "Claude outputs\before-after.jpg" "%BIN%\Claude outputs\before-after.jpg"
call :mv "Claude outputs\cargo-before-after.jpg" "%BIN%\Claude outputs\cargo-before-after.jpg"
call :mv "Claude outputs\cargo-plane-1.png" "%BIN%\Claude outputs\cargo-plane-1.png"
call :mv "Claude outputs\cargo-plane-before-after.jpg" "%BIN%\Claude outputs\cargo-plane-before-after.jpg"
call :mv "Claude outputs\cargo-plane.png" "%BIN%\Claude outputs\cargo-plane.png"
call :mv "Claude outputs\cl137-reactions.jpg" "%BIN%\Claude outputs\cl137-reactions.jpg"
call :mv "Claude outputs\cl137-walk.jpg" "%BIN%\Claude outputs\cl137-walk.jpg"
call :mv "Claude outputs\cu51" "%BIN%\Claude outputs\cu51"
call :mv "Claude outputs\cu63" "%BIN%\Claude outputs\cu63"
call :mv "Claude outputs\eyewear-before-after-1.png" "%BIN%\Claude outputs\eyewear-before-after-1.png"
call :mv "Claude outputs\eyewear-before-after.png" "%BIN%\Claude outputs\eyewear-before-after.png"
call :mv "Claude outputs\hangar-walls-keypad.jpg" "%BIN%\Claude outputs\hangar-walls-keypad.jpg"
call :mv "Claude outputs\heron-1.png" "%BIN%\Claude outputs\heron-1.png"
call :mv "Claude outputs\heron-before-after-1.jpg" "%BIN%\Claude outputs\heron-before-after-1.jpg"
call :mv "Claude outputs\heron-before-after.jpg" "%BIN%\Claude outputs\heron-before-after.jpg"
call :mv "Claude outputs\heron.png" "%BIN%\Claude outputs\heron.png"
call :mv "Claude outputs\hq-east.png" "%BIN%\Claude outputs\hq-east.png"
call :mv "Claude outputs\hq103b" "%BIN%\Claude outputs\hq103b"
call :mv "Claude outputs\job-ab-probe.json" "%BIN%\Claude outputs\job-ab-probe.json"
call :mv "Claude outputs\job-census-probe.json" "%BIN%\Claude outputs\job-census-probe.json"
call :mv "Claude outputs\job-walk-probe.json" "%BIN%\Claude outputs\job-walk-probe.json"
call :mv "Claude outputs\lab" "%BIN%\Claude outputs\lab"
call :mv "Claude outputs\old" "%BIN%\Claude outputs\old"
call :mv "Claude outputs\parachute-harness-1.jpg" "%BIN%\Claude outputs\parachute-harness-1.jpg"
call :mv "Claude outputs\parachute-harness.jpg" "%BIN%\Claude outputs\parachute-harness.jpg"
call :mv "Claude outputs\PROMPTS-2.md" "%BIN%\Claude outputs\PROMPTS-2.md"
call :mv "Claude outputs\PROMPTS-3.md" "%BIN%\Claude outputs\PROMPTS-3.md"
call :mv "Claude outputs\roof-and-warren.jpg" "%BIN%\Claude outputs\roof-and-warren.jpg"
call :mv "Claude outputs\sheet.jpg" "%BIN%\Claude outputs\sheet.jpg"
call :mv "Claude outputs\shots" "%BIN%\Claude outputs\shots"
call :mv "Claude outputs\survivors-sheet.jpg" "%BIN%\Claude outputs\survivors-sheet.jpg"
call :mv "Claude outputs\training-build-room-1.jpg" "%BIN%\Claude outputs\training-build-room-1.jpg"
call :mv "Claude outputs\training-build-room.jpg" "%BIN%\Claude outputs\training-build-room.jpg"
call :mv "Claude outputs\training-targets-1.jpg" "%BIN%\Claude outputs\training-targets-1.jpg"
call :mv "Claude outputs\training-targets.jpg" "%BIN%\Claude outputs\training-targets.jpg"
call :mv "Claude outputs\training-test-builds-1.jpg" "%BIN%\Claude outputs\training-test-builds-1.jpg"
call :mv "Claude outputs\training-test-builds.jpg" "%BIN%\Claude outputs\training-test-builds.jpg"
call :mv "Claude outputs\weapon-sounds-2-reel.mp3" "%BIN%\Claude outputs\weapon-sounds-2-reel.mp3"
call :mv "Claude outputs\zombie-sound-prompts.md" "%BIN%\Claude outputs\zombie-sound-prompts.md"
echo.
echo Moved %N% things into "%BIN%". Open it to look, then delete the whole "%BIN%" folder.
echo The game, the sounds and everyone's work are untouched.
echo.
pause
(goto) 2>nul & del "%~f0"

:mv
if not exist "%~1" goto :eof
if exist "%~2" ( echo   already there, left alone: %~1 & goto :eof )
move "%~1" "%~2" >nul 2>&1
if errorlevel 1 ( echo   could not move: %~1 ) else ( echo   moved: %~1 & set /a N+=1 )
goto :eof
