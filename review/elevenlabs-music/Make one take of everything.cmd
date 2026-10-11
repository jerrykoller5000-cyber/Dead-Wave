@echo off
rem CL-163: one round of music - one take of every track (45), straight into z-music. Asks YES and the API key first.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start music batch.ps1" -OneRound
pause
