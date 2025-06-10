#!/bin/bash

# Quick development startup script
# This is a simplified version for rapid development

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[LEO-DEV]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[LEO-DEV]${NC} $1"
}

# Quick checks
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js not found. Please install Node.js 18+"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Set development environment
export NODE_ENV=development
export NEXT_TURBOPACK=1

print_status "Starting Leo Runner in development mode..."
print_success "Server will be available at http://localhost:9002"

# Start the application
exec npm run dev