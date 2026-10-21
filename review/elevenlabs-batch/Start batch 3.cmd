@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start batch.ps1" -ManifestPath "%~dp0manifest-3.json" -OutputPath "%~dp0Generated-3"
pause
