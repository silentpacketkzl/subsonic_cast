@echo off
title Build Arpeggi Connect Docker Container
echo ========================================================
echo   Building Arpeggi Connect Docker Image
echo ========================================================

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker command not found.
    echo Please make sure Docker Desktop or Docker Engine is installed and running.
    pause
    exit /b 1
)

echo Building image 'arpeggi-connect:latest'...
docker build -t arpeggi-connect:latest .

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  Successfully built arpeggi-connect:latest!
    echo.
    echo  Run it with:
    echo    docker run -d -p 8080:8080 --name arpeggi-connect arpeggi-connect:latest
    echo  or:
    echo    docker compose up -d
    echo ========================================================
) else (
    echo [ERROR] Docker build failed.
)

pause
