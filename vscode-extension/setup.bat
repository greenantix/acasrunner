@echo off
REM ACAS Runner VS Code Extension Setup Script for Windows

echo 🚀 Setting up ACAS Runner VS Code Extension...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the vscode-extension directory.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed. Please install Node.js and npm first.
    pause
    exit /b 1
)

REM Check if code command is available
code --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: VS Code 'code' command not found. Please ensure VS Code is installed and added to PATH.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Error: Failed to install dependencies.
    pause
    exit /b 1
)

echo 🔨 Compiling TypeScript...
call npm run compile

if errorlevel 1 (
    echo ❌ Error: Failed to compile TypeScript.
    pause
    exit /b 1
)

echo 📦 Installing vsce (VS Code Extension manager)...
call npm install -g vsce

echo 📦 Packaging extension...
call vsce package

if errorlevel 1 (
    echo ⚠️  Warning: Global vsce failed. Trying with npx...
    call npx vsce package
    if errorlevel 1 (
        echo ❌ Error: Failed to package extension.
        pause
        exit /b 1
    )
)

REM Find the .vsix file
for %%f in (*.vsix) do set VSIX_FILE=%%f

if "%VSIX_FILE%"=="" (
    echo ❌ Error: Could not find packaged .vsix file.
    pause
    exit /b 1
)

echo ⚡ Installing extension in VS Code...
call code --install-extension "%VSIX_FILE%"

if errorlevel 1 (
    echo ❌ Error: Failed to install extension in VS Code.
    pause
    exit /b 1
)

echo.
echo ✅ ACAS Runner VS Code Extension installed successfully!
echo.
echo 🔧 Next steps:
echo 1. Open VS Code
echo 2. Press Ctrl+Shift+P and search for 'ACAS'
echo 3. Run 'ACAS: Connect to ACAS Runner'
echo 4. Configure settings in VS Code preferences (search for 'ACAS')
echo.
echo 📚 For more information, see the README.md file
echo.
pause