@echo off
cd /d "%~dp0"
call npm.cmd run audio -- --voice pFZP5JQG7iQjIQuC4Bku --max-chars 9500 > voice-log.txt 2>&1
type voice-log.txt
pause
