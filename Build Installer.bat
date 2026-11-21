@echo off
setlocal
rem Build Installer (Claude 2, 21 Nov 2026, Jerry: "an installer for my friends, on OneDrive").
rem 1. Stages the game and checks it boots (tools/package.mjs, through the game-test slot).
rem 2. Builds the Windows installer (desktop\, Tauri).
rem 3. Copies the installer to OneDrive\Grave Shift and to "Claude outputs\installer".
rem Every run writes "Claude outputs\installer\build.log".
cd /d "%~dp0"
set "BOX=%~dp0Claude outputs\installer"
if not exist "%BOX%" mkdir "%BOX%"
set "LOG=%BOX%\build.log"
set "RESULT=FAILED"
> "%LOG%" echo Build Installer - %date% %time%

echo Step 1 of 3: packing the game and checking it starts...
>> "%LOG%" echo === package (slot) ===
call node crew\crew.mjs slot run claude2 INSTALLER --checks "package boot check" -- node tools\package.mjs >> "%LOG%" 2>&1
if errorlevel 1 (
  >> "%LOG%" echo ERROR: the game copy did not pass its boot check.
  goto :done
)

echo Step 2 of 3: building the installer (this takes several minutes)...
>> "%LOG%" echo === tauri build ===
pushd desktop
if not exist node_modules call npm install >> "%LOG%" 2>&1
call npx tauri build >> "%LOG%" 2>&1
set "ERR=%errorlevel%"
popd
if not "%ERR%"=="0" (
  >> "%LOG%" echo ERROR: the installer build failed.
  goto :done
)

echo Step 3 of 3: copying it to OneDrive...
set "SETUP="
for /f "delims=" %%F in ('dir /b /o-d "desktop\src-tauri\target\release\bundle\nsis\*-setup.exe"') do if not defined SETUP set "SETUP=%%F"
if not defined SETUP (
  >> "%LOG%" echo ERROR: no installer found in desktop\src-tauri\target\release\bundle\nsis.
  goto :done
)
>> "%LOG%" echo Installer: %SETUP%
copy /y "desktop\src-tauri\target\release\bundle\nsis\%SETUP%" "%BOX%\" >> "%LOG%" 2>&1
set "OD=%OneDrive%"
if not defined OD set "OD=%OneDriveCommercial%"
if not defined OD set "OD=%USERPROFILE%\OneDrive - stu.ctcd.edu"
if not exist "%OD%" (
  >> "%LOG%" echo ERROR: OneDrive folder not found: %OD%. The installer is in "Claude outputs\installer".
  set "RESULT=BUILT, NOT ON ONEDRIVE"
  goto :done
)
if not exist "%OD%\Grave Shift" mkdir "%OD%\Grave Shift"
copy /y "desktop\src-tauri\target\release\bundle\nsis\%SETUP%" "%OD%\Grave Shift\" >> "%LOG%" 2>&1
if errorlevel 1 (
  set "RESULT=BUILT, NOT ON ONEDRIVE"
  goto :done
)
>> "%LOG%" echo OneDrive: %OD%\Grave Shift\%SETUP%
set "RESULT=DONE"

:done
>> "%LOG%" echo.
>> "%LOG%" echo RESULT: %RESULT%
echo.
type "%LOG%" | findstr /b "RESULT Installer OneDrive ERROR"
echo.
echo Done. You can close this window.
pause
exit /b 0
