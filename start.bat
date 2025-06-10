@echo off
REM Leo Runner Startup Script for Windows
REM Comprehensive startup script with environment detection

setlocal enabledelayedexpansion

REM Configuration
set DEFAULT_PORT=9002
set NODE_ENV=development
if "%NODE_ENV%"=="" set NODE_ENV=development

REM Colors (if supported)
set "COLOR_BLUE=[94m"
set "COLOR_GREEN=[92m"
set "COLOR_YELLOW=[93m"
set "COLOR_RED=[91m"
set "COLOR_RESET=[0m"

echo.
echo %COLOR_BLUE%=== Leo Runner Startup ===%COLOR_RESET%
echo Mode: Development
echo Port: %DEFAULT_PORT%
echo Environment: %NODE_ENV%
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%[ERROR]%COLOR_RESET% Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% Node.js detected

REM Check dependencies
if not exist "node_modules" (
    echo %COLOR_BLUE%[INFO]%COLOR_RESET% Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo %COLOR_RED%[ERROR]%COLOR_RESET% Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo %COLOR_BLUE%[INFO]%COLOR_RESET% Dependencies found
)

REM Check environment file
if not exist ".env" (
    if exist ".env.example" (
        echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% No .env file found. Copying from .env.example...
        copy ".env.example" ".env"
        echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% Please edit .env file and add your API keys
    ) else (
        echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% No .env file found. Some features may not work without API keys.
    )
)

REM Check for Ollama
where ollama >nul 2>&1
if errorlevel 1 (
    echo %COLOR_BLUE%[INFO]%COLOR_RESET% Ollama not found - install from https://ollama.ai for local LLM support
) else (
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% Ollama detected
)

REM Set environment variables
set NODE_ENV=development
set NEXT_TURBOPACK=1

echo.
echo %COLOR_BLUE%[INFO]%COLOR_RESET% Starting Leo Runner in development mode...
echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% Server will be available at http://localhost:%DEFAULT_PORT%
echo.

REM Start the application
call npm run dev

if errorlevel 1 (
    echo.
    echo %COLOR_RED%[ERROR]%COLOR_RESET% Failed to start the application
    pause
    exit /b 1
)

pause