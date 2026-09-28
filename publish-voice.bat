@echo off
cd /d "%~dp0"
(
git add public/audio src/content/audio-manifest.json scripts/make-audio.ts .gitignore voice-samples.bat voice-record.bat publish-voice.bat
git rm --cached -q --ignore-unmatch s.txt
git diff --cached --name-only | findstr /i "API-Key GOOGLE_API ELEVENLABS_API" && (echo KEY FILE STAGED - STOPPED & git reset -q & exit /b 1)
git commit -m "Lily voice: first 569 recordings"
git push
echo PUBLISH-DONE
) > publish-log.txt 2>&1
type publish-log.txt
pause
