@echo off
title ACAS Runner - Claude Code Enhanced Startup
cls
echo ==========================================
echo  ACAS Runner - Claude Code Enhanced Setup
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

REM Check for Claude Code configuration
if exist ".claude-code.json" (
    echo ✅ Claude Code configuration found
) else (
    echo ⚠️  Claude Code configuration not found - will be created
)
echo.

echo Choose an option:
echo 1. 🚀 Full setup: Install dependencies + Claude Code setup + Start dev server
echo 2. ⚡ Quick start: Just start development server
echo 3. 🔧 Setup only: Install dependencies and Claude Code configuration
echo 4. 🤖 Start with AI services (recommended for Claude Code)
echo 5. 📊 Analyze project structure
echo 6. 📝 Generate documentation
echo 7. 🧹 Clean and reinstall everything
echo 8. Exit
echo.
set /p choice="Enter choice (1-8): "

if "%choice%"=="1" (
    echo ==========================================
    echo 🚀 Full Setup Starting...
    echo ==========================================
    echo.
    
    echo Installing main dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    
    echo.
    echo Setting up Claude Code environment...
    call npm run claude:setup
    
    echo.
    echo Starting development server with AI services...
    echo Application will be available at: http://localhost:9002
    echo AI services will be available in separate window
    echo Press Ctrl+C in each window to stop
    echo.
    call npm run dev:ai
    
) else if "%choice%"=="2" (
    echo ==========================================
    echo ⚡ Quick Start
    echo ==========================================
    echo Starting development server...
    echo Application will be available at: http://localhost:9002
    echo Press Ctrl+C to stop
    echo.
    call npm run dev
    
) else if "%choice%"=="3" (
    echo ==========================================
    echo 🔧 Setup Only
    echo ==========================================
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies
    ) else (
        echo ✅ Dependencies installed successfully!
        echo.
        echo Setting up Claude Code environment...
        call npm run claude:setup
        echo.
        echo ✅ Setup complete!
        echo.
        echo You can now:
        echo - Open workspace: code acas-runner.code-workspace
        echo - Start development: npm run dev
        echo - Start with AI: npm run dev:ai
    )
    echo.
    echo Press any key to exit...
    pause >nul
    
) else if "%choice%"=="4" (
    echo ==========================================
    echo 🤖 Starting with AI Services
    echo ==========================================
    echo This will start both the web app and AI services
    echo Perfect for Claude Code integration!
    echo.
    echo Web app: http://localhost:9002
    echo AI services: Check the genkit window for details
    echo.
    call npm run dev:ai
    
) else if "%choice%"=="5" (
    echo ==========================================
    echo 📊 Analyzing Project Structure
    echo ==========================================
    call npm run claude:analyze
    echo.
    echo Press any key to continue...
    pause >nul
    
) else if "%choice%"=="6" (
    echo ==========================================
    echo 📝 Generating Documentation
    echo ==========================================
    call npm run claude:docs
    echo.
    echo Press any key to continue...
    pause >nul
    
) else if "%choice%"=="7" (
    echo ==========================================
    echo 🧹 Clean and Reinstall
    echo ==========================================
    echo Cleaning project...
    call npm run clean
    echo.
    echo Reinstalling dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to reinstall dependencies
    ) else (
        echo ✅ Clean installation complete!
        echo.
        echo Setting up Claude Code...
        call npm run claude:setup
    )
    echo.
    echo Press any key to continue...
    pause >nul
    
) else if "%choice%"=="8" (
    echo Exiting...
    exit /b 0
    
) else (
    echo Invalid choice. Starting development server...
    call npm run dev
)

echo.
echo ==========================================
echo 🎉 Claude Code Enhanced Startup Complete!
echo ==========================================
echo.
echo 💡 Pro Tips for Claude Code:
echo - Open the workspace: code acas-runner.code-workspace
echo - Use dev:ai for full AI integration
echo - Run claude:analyze to understand your project
echo - Use claude:docs to keep documentation updated
echo.
echo Press any key to exit...
pause >nul