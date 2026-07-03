@echo off
title Zari Inventory - Starting Servers...
color 0A

echo.
echo  ============================================
echo   Zari Inventory Management System
echo  ============================================
echo.
echo  Starting Backend + Frontend servers...
echo.

:: Start Backend in a new window
start "Zari Backend (Port 5000)" cmd /k "cd /d "%~dp0backend" && powershell -ExecutionPolicy Bypass -Command "npx tsx watch src/server.ts""

:: Wait 3 seconds for backend to init
timeout /t 3 /nobreak > nul

:: Start Frontend in a new window
start "Zari Frontend (Port 3000)" cmd /k "cd /d "%~dp0web" && powershell -ExecutionPolicy Bypass -Command "npx next dev""

:: Wait 5 seconds for frontend to start
echo  Waiting for servers to start...
timeout /t 5 /nobreak > nul

:: Open browser
echo  Opening browser...
start http://localhost:3000

echo.
echo  ============================================
echo   Servers are running!
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:3000
echo  ============================================
echo.
echo  You can close this window.
echo  To stop servers, close the two server windows.
echo.
pause
