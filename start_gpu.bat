@echo off
title RooGen RTX GPU Local Server Launcher
echo ====================================================================
echo             RooGen RTX GPU Local Server Launcher
echo ====================================================================
echo.
echo [1/3] Switching drive focus to G: drive...
G:
echo [2/3] Navigating to the RooGen project root directory...
cd "%~dp0"
echo [3/3] Launching Python RTX GPU Server (app.py)...
echo.
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python failed to start or crashed. Please ensure Python is installed and app.py exists.
    pause
)
