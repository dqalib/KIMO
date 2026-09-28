@echo off
REM Makes voice sample clips in the audio-samples folder. Output also saved to voice-log.txt
cd /d "%~dp0"
echo Making voice samples... this takes about a minute.
call npm.cmd install --no-audit --no-fund > voice-log.txt 2>&1
call npm.cmd run audio -- --samples >> voice-log.txt 2>&1
type voice-log.txt
echo.
echo Finished. You can close this window.
pause
