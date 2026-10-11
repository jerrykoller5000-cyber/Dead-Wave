@echo off
rem CL-164 (Claude, 2026-10-11): finishes labeling the new ElevenLabs sounds Jerry put in z-sounds.
rem 1. Each new download is replaced by its labeled, evened copy (<sound>-N.ogg). The downloads themselves are
rem    kept, moved to review\z-sounds-originals-cl164 (nothing is deleted).
rem 2. world\cave-mouth had ended up inside world\crickets-night: it goes back where the game looks for it.
rem Running it twice is harmless. When it has run, this file removes itself.
setlocal
cd /d "%~dp0"
set /a N=0
set /a ERR=0
set "ORIG=review\z-sounds-originals-cl164"
set "NEW=review\z-sounds-cl164"
call :mv "z-sounds\turrets\mortar-incoming\ElevenLabs_audio_elevenlabs-sound-effects-v2_Incoming artill_2026-10-11T02_15_44.mp3" "%ORIG%\turrets\mortar-incoming\ElevenLabs_audio_elevenlabs-sound-effects-v2_Incoming artill_2026-10-11T02_15_44.mp3"
call :mv "z-sounds\turrets\mortar-incoming\ElevenLabs_audio_elevenlabs-sound-effects-v2_Incoming artill_2026-10-11T02_16_25.mp3" "%ORIG%\turrets\mortar-incoming\ElevenLabs_audio_elevenlabs-sound-effects-v2_Incoming artill_2026-10-11T02_16_25.mp3"
call :mv "z-sounds\ui\badge\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal gui_2026-10-11T02_18_54.mp3" "%ORIG%\ui\badge\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal gui_2026-10-11T02_18_54.mp3"
call :mv "z-sounds\ui\day-cleared\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal cel_2026-10-11T02_20_29.mp3" "%ORIG%\ui\day-cleared\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal cel_2026-10-11T02_20_29.mp3"
call :mv "z-sounds\ui\deja-vu\ElevenLabs_audio_elevenlabs-sound-effects-v2_Otherworldly mu_2026-10-11T02_22_43.mp3" "%ORIG%\ui\deja-vu\ElevenLabs_audio_elevenlabs-sound-effects-v2_Otherworldly mu_2026-10-11T02_22_43.mp3"
call :mv "z-sounds\ui\game-over\ElevenLabs_audio_elevenlabs-sound-effects-v2_Crushingly heav_2026-10-11T02_28_28.mp3" "%ORIG%\ui\game-over\ElevenLabs_audio_elevenlabs-sound-effects-v2_Crushingly heav_2026-10-11T02_28_28.mp3"
call :mv "z-sounds\ui\missing-in-action\ElevenLabs_audio_elevenlabs-sound-effects-v2_Very heavy meta_2026-10-11T02_30_38.mp3" "%ORIG%\ui\missing-in-action\ElevenLabs_audio_elevenlabs-sound-effects-v2_Very heavy meta_2026-10-11T02_30_38.mp3"
call :mv "z-sounds\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (1).mp3" "%ORIG%\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (1).mp3"
call :mv "z-sounds\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (2).mp3" "%ORIG%\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (2).mp3"
call :mv "z-sounds\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (3).mp3" "%ORIG%\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11 (3).mp3"
call :mv "z-sounds\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11.mp3" "%ORIG%\ui\streak\ElevenLabs_audio_elevenlabs-sound-effects-v2_Heavy metal rif_2026-10-11T02_33_11.mp3"
call :mv "z-sounds\ui\victory\ElevenLabs_audio_elevenlabs-sound-effects-v2_Wild triumphant_2026-10-11T02_34_27.mp3" "%ORIG%\ui\victory\ElevenLabs_audio_elevenlabs-sound-effects-v2_Wild triumphant_2026-10-11T02_34_27.mp3"
call :mv "z-sounds\ui\wave-start\ElevenLabs_audio_elevenlabs-sound-effects-v2_Extremely omino_2026-10-11T02_35_49.mp3" "%ORIG%\ui\wave-start\ElevenLabs_audio_elevenlabs-sound-effects-v2_Extremely omino_2026-10-11T02_35_49.mp3"
call :mv "z-sounds\weapon-foley\chainsaw-idle\ElevenLabs_audio_elevenlabs-sound-effects-v2_Chainsaw engine_2026-10-11T02_42_43.mp3" "%ORIG%\weapon-foley\chainsaw-idle\ElevenLabs_audio_elevenlabs-sound-effects-v2_Chainsaw engine_2026-10-11T02_42_43.mp3"
call :mv "z-sounds\weapons\carbine-suppressed\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25 (1).mp3" "%ORIG%\weapons\carbine-suppressed\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25 (1).mp3"
call :mv "z-sounds\weapons\mortar-launch\ElevenLabs_audio_elevenlabs-sound-effects-v2_Short single 40_2026-10-11T02_53_50 (1).mp3" "%ORIG%\weapons\mortar-launch\ElevenLabs_audio_elevenlabs-sound-effects-v2_Short single 40_2026-10-11T02_53_50 (1).mp3"
call :mv "z-sounds\weapons\mortar-launch\ElevenLabs_audio_elevenlabs-sound-effects-v2_Short single 40_2026-10-11T02_53_50.mp3" "%ORIG%\weapons\mortar-launch\ElevenLabs_audio_elevenlabs-sound-effects-v2_Short single 40_2026-10-11T02_53_50.mp3"
call :mv "z-sounds\weapons\pistol-suppressed\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25 (1).mp3" "%ORIG%\weapons\pistol-suppressed\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25 (1).mp3"
call :mv "z-sounds\weapons\pistol\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single 9mm pist_2026-10-11T02_54_56.mp3" "%ORIG%\weapons\pistol\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single 9mm pist_2026-10-11T02_54_56.mp3"
call :mv "z-sounds\weapons\revolver\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25.mp3" "%ORIG%\weapons\revolver\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single gunshot,_2026-10-11T03_04_25.mp3"
call :mv "z-sounds\weapons\shotgun\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single 12 gauge_2026-10-11T03_06_38.mp3" "%ORIG%\weapons\shotgun\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single 12 gauge_2026-10-11T03_06_38.mp3"
call :mv "z-sounds\weapons\smg\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single .45 cali_2026-10-11T03_07_20.mp3" "%ORIG%\weapons\smg\ElevenLabs_audio_elevenlabs-sound-effects-v2_Single .45 cali_2026-10-11T03_07_20.mp3"
call :mv "z-sounds\world\graveyard-ambience\ElevenLabs_audio_elevenlabs-sound-effects-v2_Still graveyard_2026-10-11T03_10_48.mp3" "%ORIG%\world\graveyard-ambience\ElevenLabs_audio_elevenlabs-sound-effects-v2_Still graveyard_2026-10-11T03_10_48.mp3"
call :mv "z-sounds\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_16.mp3" "%ORIG%\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_16.mp3"
call :mv "z-sounds\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17 (1).mp3" "%ORIG%\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17 (1).mp3"
call :mv "z-sounds\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17 (2).mp3" "%ORIG%\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17 (2).mp3"
call :mv "z-sounds\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17.mp3" "%ORIG%\world\lake-shore\ElevenLabs_audio_elevenlabs-sound-effects-v2_Calm lake shore_2026-10-11T03_12_17.mp3"
call :mv "z-sounds\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (1).mp3" "%ORIG%\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (1).mp3"
call :mv "z-sounds\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (2).mp3" "%ORIG%\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (2).mp3"
call :mv "z-sounds\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (3).mp3" "%ORIG%\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10 (3).mp3"
call :mv "z-sounds\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10.mp3" "%ORIG%\world\rain\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft steady rai_2026-10-11T03_14_10.mp3"
call :mv "z-sounds\world\wind-day\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft gentle bre_2026-10-11T03_17_07.mp3" "%ORIG%\world\wind-day\ElevenLabs_audio_elevenlabs-sound-effects-v2_Soft gentle bre_2026-10-11T03_17_07.mp3"
call :mv "z-sounds\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_57.mp3" "%ORIG%\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_57.mp3"
call :mv "z-sounds\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58 (1).mp3" "%ORIG%\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58 (1).mp3"
call :mv "z-sounds\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58 (2).mp3" "%ORIG%\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58 (2).mp3"
call :mv "z-sounds\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58.mp3" "%ORIG%\world\wind-night\ElevenLabs_audio_elevenlabs-sound-effects-v2_Cold winter nig_2026-10-11T03_17_58.mp3"
call :mv "%NEW%\turrets\mortar-incoming\mortar-incoming-1.ogg" "z-sounds\turrets\mortar-incoming\mortar-incoming-1.ogg"
call :mv "%NEW%\turrets\mortar-incoming\mortar-incoming-2.ogg" "z-sounds\turrets\mortar-incoming\mortar-incoming-2.ogg"
call :mv "%NEW%\ui\badge\badge-1.ogg" "z-sounds\ui\badge\badge-1.ogg"
call :mv "%NEW%\ui\day-cleared\day-cleared-1.ogg" "z-sounds\ui\day-cleared\day-cleared-1.ogg"
call :mv "%NEW%\ui\deja-vu\deja-vu-1.ogg" "z-sounds\ui\deja-vu\deja-vu-1.ogg"
call :mv "%NEW%\ui\game-over\game-over-1.ogg" "z-sounds\ui\game-over\game-over-1.ogg"
call :mv "%NEW%\ui\missing-in-action\missing-in-action-1.ogg" "z-sounds\ui\missing-in-action\missing-in-action-1.ogg"
call :mv "%NEW%\ui\streak\streak-1.ogg" "z-sounds\ui\streak\streak-1.ogg"
call :mv "%NEW%\ui\streak\streak-2.ogg" "z-sounds\ui\streak\streak-2.ogg"
call :mv "%NEW%\ui\streak\streak-3.ogg" "z-sounds\ui\streak\streak-3.ogg"
call :mv "%NEW%\ui\streak\streak-4.ogg" "z-sounds\ui\streak\streak-4.ogg"
call :mv "%NEW%\ui\victory\victory-1.ogg" "z-sounds\ui\victory\victory-1.ogg"
call :mv "%NEW%\ui\wave-start\wave-start-1.ogg" "z-sounds\ui\wave-start\wave-start-1.ogg"
call :mv "%NEW%\weapon-foley\chainsaw-idle\chainsaw-idle-1.ogg" "z-sounds\weapon-foley\chainsaw-idle\chainsaw-idle-1.ogg"
call :mv "%NEW%\weapons\carbine-suppressed\carbine-suppressed-1.ogg" "z-sounds\weapons\carbine-suppressed\carbine-suppressed-1.ogg"
call :mv "%NEW%\weapons\mortar-launch\mortar-launch-1.ogg" "z-sounds\weapons\mortar-launch\mortar-launch-1.ogg"
call :mv "%NEW%\weapons\mortar-launch\mortar-launch-2.ogg" "z-sounds\weapons\mortar-launch\mortar-launch-2.ogg"
call :mv "%NEW%\weapons\pistol-suppressed\pistol-suppressed-1.ogg" "z-sounds\weapons\pistol-suppressed\pistol-suppressed-1.ogg"
call :mv "%NEW%\weapons\pistol\pistol-1.ogg" "z-sounds\weapons\pistol\pistol-1.ogg"
call :mv "%NEW%\weapons\revolver\revolver-1.ogg" "z-sounds\weapons\revolver\revolver-1.ogg"
call :mv "%NEW%\weapons\shotgun\shotgun-1.ogg" "z-sounds\weapons\shotgun\shotgun-1.ogg"
call :mv "%NEW%\weapons\smg\smg-1.ogg" "z-sounds\weapons\smg\smg-1.ogg"
call :mv "%NEW%\world\graveyard-ambience\graveyard-ambience-1.ogg" "z-sounds\world\graveyard-ambience\graveyard-ambience-1.ogg"
call :mv "%NEW%\world\lake-shore\lake-shore-1.ogg" "z-sounds\world\lake-shore\lake-shore-1.ogg"
call :mv "%NEW%\world\lake-shore\lake-shore-2.ogg" "z-sounds\world\lake-shore\lake-shore-2.ogg"
call :mv "%NEW%\world\lake-shore\lake-shore-3.ogg" "z-sounds\world\lake-shore\lake-shore-3.ogg"
call :mv "%NEW%\world\lake-shore\lake-shore-4.ogg" "z-sounds\world\lake-shore\lake-shore-4.ogg"
call :mv "%NEW%\world\rain\rain-1.ogg" "z-sounds\world\rain\rain-1.ogg"
call :mv "%NEW%\world\rain\rain-2.ogg" "z-sounds\world\rain\rain-2.ogg"
call :mv "%NEW%\world\rain\rain-3.ogg" "z-sounds\world\rain\rain-3.ogg"
call :mv "%NEW%\world\rain\rain-4.ogg" "z-sounds\world\rain\rain-4.ogg"
call :mv "%NEW%\world\wind-day\wind-day-1.ogg" "z-sounds\world\wind-day\wind-day-1.ogg"
call :mv "%NEW%\world\wind-night\wind-night-1.ogg" "z-sounds\world\wind-night\wind-night-1.ogg"
call :mv "%NEW%\world\wind-night\wind-night-2.ogg" "z-sounds\world\wind-night\wind-night-2.ogg"
call :mv "%NEW%\world\wind-night\wind-night-3.ogg" "z-sounds\world\wind-night\wind-night-3.ogg"
call :mv "%NEW%\world\wind-night\wind-night-4.ogg" "z-sounds\world\wind-night\wind-night-4.ogg"
call :mv "z-sounds\world\crickets-night\cave-mouth" "z-sounds\world\cave-mouth"
if %ERR%==0 if exist "%NEW%" rd /s /q "%NEW%"
echo.
echo Done: %N% moves, %ERR% problems.
echo The new sounds are labeled in z-sounds; your original downloads are in %ORIG%.
echo Restart the game (or refresh the Training Ground) to hear them.
echo.
pause
if not %ERR%==0 goto :eof
(goto) 2>nul & del "%~f0"
goto :eof

:mv
if not exist "%~1" goto :eof
if exist "%~2" goto :taken
for %%P in ("%~2") do if not exist "%%~dpP" mkdir "%%~dpP"
move "%~1" "%~2" >nul 2>&1
if errorlevel 1 goto :failed
set /a N+=1
echo   moved: "%~1"
goto :eof
:taken
echo   already there, left alone: "%~2"
goto :eof
:failed
echo   could not move: "%~1"
set /a ERR+=1
goto :eof
