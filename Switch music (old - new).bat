@echo off
rem CL-165: swaps the game between the new ElevenLabs music and the old music. Nothing is deleted.
setlocal
cd /d "%~dp0assets\soundtrack"
if not exist music-old.json goto missing
if not exist music-elevenlabs.json goto missing
fc /b music.json music-elevenlabs.json >nul 2>&1
if errorlevel 1 goto tonew
copy /y music-old.json music.json >nul
echo.
echo   The game now plays the OLD music (the songs from before ElevenLabs).
goto done
:tonew
copy /y music-elevenlabs.json music.json >nul
echo.
echo   The game now plays the NEW ElevenLabs music.
goto done
:missing
echo.
echo   Could not find music-old.json and music-elevenlabs.json in assets\soundtrack.
:done
echo   Reload the game (F5) to hear it. Run this again to switch back.
echo.
pause
