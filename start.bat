@echo off
title Arpeggi Subsonic Music Player & Spotify Connect
echo ========================================================
echo   Starting Arpeggi Music Player & PC Speaker Receiver
echo ========================================================

set "NODE_EXE=%LOCALAPPDATA%\Programs\node-portable\node.exe"

if not exist "%NODE_EXE%" (
    echo [ERROR] Portable Node.js not found at %NODE_EXE%
    echo Checking system PATH for node...
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "NODE_EXE=node"
    ) else (
        echo Please ensure Node.js is installed or run setup.
        pause
        exit /b 1
    )
)

echo Starting Server...
start "" "%NODE_EXE%" server.js

timeout /t 2 /nobreak >nul

echo Opening PC Receiver in your default browser...
start http://localhost:8080/receiver.html

echo.
echo ========================================================
echo  Server is running!
echo  1. Your PC will play audio through its speakers.
echo  2. Check the command window or Receiver page for the
echo     iPhone URL to connect from your phone.
echo ========================================================
