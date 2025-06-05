#!/bin/bash

# ACAS Runner VS Code Extension Setup Script

echo "🚀 Setting up ACAS Runner VS Code Extension..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the vscode-extension directory."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if code command is available
if ! command -v code &> /dev/null; then
    echo "❌ Error: VS Code 'code' command not found. Please ensure VS Code is installed and added to PATH."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install dependencies."
    exit 1
fi

echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to compile TypeScript."
    exit 1
fi

echo "📦 Installing vsce (VS Code Extension manager)..."
npm install -g vsce

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to install vsce globally. Trying with npx..."
fi

echo "📦 Packaging extension..."
if command -v vsce &> /dev/null; then
    vsce package
else
    npx vsce package
fi

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to package extension."
    exit 1
fi

# Find the .vsix file
VSIX_FILE=$(find . -name "*.vsix" | head -n 1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ Error: Could not find packaged .vsix file."
    exit 1
fi

echo "⚡ Installing extension in VS Code..."
code --install-extension "$VSIX_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to install extension in VS Code."
    exit 1
fi

echo ""
echo "✅ ACAS Runner VS Code Extension installed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Open VS Code"
echo "2. Press Ctrl+Shift+P and search for 'ACAS'"
echo "3. Run 'ACAS: Connect to ACAS Runner'"
echo "4. Configure settings in VS Code preferences (search for 'ACAS')"
echo ""
echo "📚 For more information, see the README.md file"