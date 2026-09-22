@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Removing old Tiny Trek files (already backed up in
echo   "Tiny Trek Backup 2026-09-21" next to this folder)
echo ============================================

if exist "__pycache__" rmdir /s /q "__pycache__"
if exist ".git" rmdir /s /q ".git"
if exist "assets\music" rmdir /s /q "assets\music"
if exist "Claude outputs" rmdir /s /q "Claude outputs"
if exist ".syntax-tmp.mjs" del /q ".syntax-tmp.mjs"
if exist ".syntax.cjs" del /q ".syntax.cjs"
if exist "assets\UAL1_License.txt" del /q "assets\UAL1_License.txt"
if exist "assets\UAL1_Standard.glb" del /q "assets\UAL1_Standard.glb"
if exist "Commit and Push.bat" del /q "Commit and Push.bat"
if exist "index.dev.html" del /q "index.dev.html"
if exist "PERFORMANCE-REPORT.txt" del /q "PERFORMANCE-REPORT.txt"
if exist "Play Tiny Trek.bat" del /q "Play Tiny Trek.bat"
if exist "README.txt" del /q "README.txt"
if exist "server.log" del /q "server.log"
if exist "server-error.log" del /q "server-error.log"
if exist "tools\probe-gear.mjs" del /q "tools\probe-gear.mjs"

echo.
echo ============================================
echo   Setting up git, pointed at Dead-Wave
echo ============================================
git init
git remote add origin https://github.com/jerrykoller5000-cyber/Dead-Wave.git
git fetch origin feature/Phis-changes
git checkout -B feature/Phis-changes origin/feature/Phis-changes -f

echo.
echo ============================================
echo   Done! This folder is now a clean Dead-Wave
echo   checkout on branch feature/Phis-changes.
echo   You can delete this .bat file when you're
echo   happy with the result.
echo ============================================
pause
