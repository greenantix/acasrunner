@echo off
title ACAS Runner - Simple Startup
cls
echo ==========================================
echo  ACAS Runner - Simple Startup
echo ==========================================
echo.

REM Use the current directory where this script is located
echo Script location: %~dp0
echo Current directory: %CD%
echo.

REM Change to the script's directory (where the project should be)
cd /d "%~dp0"
echo Changed to: %CD%
echo.

REM Check if this looks like the right directory
if not exist "package.json" (
    echo ERROR: This doesn't appear to be the ACAS Runner project directory
    echo Expected to find package.json here
    echo.
    echo Please make sure you've placed this script in the acas-runner-local directory
    echo Current files in this directory:
    dir /b
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Found package.json - this appears to be the correct directory
echo.

REM Quick check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    echo Please install Node.js from https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Node.js version: 
node --version
echo.

echo Choose an option:
echo 1. Install dependencies and start development server
echo 2. Just start development server (skip install)
echo 3. Install dependencies only
echo 4. Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo.
    echo Starting development server...
    echo Application will be available at: http://localhost:9002
    echo Press Ctrl+C to stop
    echo.
    call npm run dev
) else if "%choice%"=="2" (
    echo Starting development server...
    echo Application will be available at: http://localhost:9002
    echo Press Ctrl+C to stop
    echo.
    call npm run dev
) else if "%choice%"=="3" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
    ) else (
        echo Dependencies installed successfully!
        echo You can now run: npm run dev
    )
    echo.
    echo Press any key to exit...
    pause >nul
) else (
    echo Exiting...
    exit /b 0
)

echo.
echo Press any key to exit...
pause >nul