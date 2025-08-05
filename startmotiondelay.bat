@echo off
echo Starting OBS motion detection script in 30 seconds...
echo.
echo Please ensure OBS Studio is launching.
echo.

rem Waits for 30 seconds. The /nobreak option prevents the user from skipping the delay.
timeout /t 30 /nobreak

echo Launching script...
rem Navigates to the correct project folder
cd "C:\obs-motionstream"

rem Starts the Node.js script
npm start