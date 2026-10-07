@echo off
rem Records everything the app says with ONE Google British voice (free: 1 million characters a month; the whole app is about 160,000).
rem Needs your Google API key (starts AIza) on its own in GOOGLE_API.txt in this folder.
rem To try other voices first: npm.cmd run audio -- --provider google --samples   (clips appear in audio-samples)
rem then change VOICE below to the one you like.
set VOICE=en-GB-Chirp3-HD-Leda
cd /d "%~dp0"
(
call npm.cmd run audio -- --provider google --voice %VOICE% --force --prune
if errorlevel 1 (echo RECORDING STOPPED - nothing was published & exit /b 1)
git add public/audio src/content/audio-manifest.json
git add -u public/audio
git diff --cached --name-only | findstr /i "API-Key GOOGLE_API ELEVENLABS_API" && (echo KEY FILE STAGED - STOPPED & git reset -q & exit /b 1)
git commit -m "British voice: record everything with Google %VOICE%"
git push
echo VOICE-DONE
) > voice-google-log.txt 2>&1
type voice-google-log.txt
pause
