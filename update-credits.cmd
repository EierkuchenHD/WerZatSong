@echo off
rem Gets the newest pklz credits from the Lostwave Fingerprints sheet and
rem fills in the credits nobody knew in the result files (logs folder).
cd /d "%~dp0"
node scripts\credits.js update %*
echo.
pause
