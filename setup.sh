#!/bin/bash

# Leo Runner Setup Script
# One-time setup for new installations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SETUP]${NC} $1"
}

print_error() {
    echo -e "${RED}[SETUP]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
print_status "=== Leo Runner Setup ==="
echo ""

# Check Node.js
print_status "Checking Node.js installation..."
if ! command_exists node; then
    print_error "Node.js is not installed"
    print_status "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is not supported"
    print_status "Please upgrade to Node.js 18+"
    exit 1
fi

print_success "Node.js version $(node -v) detected"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm version $(npm -v) detected"

# Install dependencies
print_status "Installing project dependencies..."
npm install

# Firebase Functions dependencies
if [ -d "functions" ]; then
    print_status "Installing Firebase Functions dependencies..."
    cd functions
    npm install
    cd ..
fi

# VSCode Extension dependencies
if [ -d "vscode-extension" ]; then
    print_status "Installing VSCode Extension dependencies..."
    cd vscode-extension
    npm install
    cd ..
fi

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please edit .env file and add your API keys"
    else
        print_warning "No .env.example file found"
    fi
else
    print_success ".env file already exists"
fi

# Check for optional tools
print_status "Checking optional tools..."

# Check Firebase CLI
if command_exists firebase; then
    print_success "Firebase CLI detected"
else
    print_warning "Firebase CLI not found"
    print_status "Install with: npm install -g firebase-tools"
fi

# Check Ollama
if command_exists ollama; then
    print_success "Ollama detected"
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        print_success "Ollama is running"
    else
        print_warning "Ollama is installed but not running"
        print_status "Start with: ollama serve"
    fi
else
    print_warning "Ollama not found"
    print_status "Install from https://ollama.ai for local LLM support"
    print_status "Recommended models: ollama pull llama3.2"
fi

# Run initial build check
print_status "Running initial build check..."
if npm run typecheck; then
    print_success "TypeScript compilation successful"
else
    print_warning "TypeScript errors detected - you may need to fix these"
fi

echo ""
print_success "=== Setup Complete ==="
echo ""
print_status "Next steps:"
echo "  1. Edit .env file and add your API keys"
echo "  2. Run './start.sh' to start the development server"
echo "  3. Open http://localhost:9002 in your browser"
echo ""
print_status "Available startup options:"
echo "  ./start.sh          - Full startup with checks"
echo "  ./start-dev.sh      - Quick development startup"
echo "  ./start.sh prod     - Production build and start"
echo "  ./start.sh build    - Build only"
echo ""

if [ ! -f ".env" ] || ! grep -q "your_.*_api_key_here" .env 2>/dev/null; then
    print_warning "Don't forget to configure your API keys in .env file for full functionality!"
fi