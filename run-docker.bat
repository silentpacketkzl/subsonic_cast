@echo off
title Run Arpeggi Connect Docker Container
echo ========================================================
echo   Starting Arpeggi Connect Docker Container
echo ========================================================

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker command not found.
    echo Please make sure Docker Desktop or Docker Engine is installed and running.
    pause
    exit /b 1
)

echo Starting container with docker compose...
docker compose up -d

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  Container is running!
    echo  Opening PC Receiver: http://localhost:8080/receiver.html
    echo ========================================================
    timeout /t 2 /nobreak >nul
    start http://localhost:8080/receiver.html
) else (
    echo [ERROR] Failed to start container.
)

pause
