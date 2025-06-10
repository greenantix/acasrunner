#!/bin/bash

# Leo Runner Startup Script
# Comprehensive startup script with environment detection and dependency management

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_PORT=9002
NODE_ENV=${NODE_ENV:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+"
        exit 1
    fi
    
    print_success "Node.js version $(node -v) detected"
}

# Function to check and install dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        print_status "Installing Node.js dependencies..."
        npm install
    else
        print_status "Dependencies already installed, checking for updates..."
        npm ci --production=false
    fi
    
    # Check Firebase Functions dependencies
    if [ -d "functions" ]; then
        print_status "Checking Firebase Functions dependencies..."
        cd functions
        if [ ! -d "node_modules" ]; then
            print_status "Installing Firebase Functions dependencies..."
            npm install
        fi
        cd ..
    fi
    
    # Check VSCode Extension dependencies
    if [ -d "vscode-extension" ]; then
        print_status "Checking VSCode Extension dependencies..."
        cd vscode-extension
        if [ ! -d "node_modules" ]; then
            print_status "Installing VSCode Extension dependencies..."
            npm install
        fi
        cd ..
    fi
}

# Function to check environment variables
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning "No .env file found. Copying from .env.example..."
            cp .env.example .env
            print_warning "Please edit .env file and add your API keys before starting the application"
        else
            print_warning "No .env file found. Some features may not work without API keys."
        fi
    fi
    
    # Check for required environment variables
    if [ -f ".env" ]; then
        source .env
        
        # Check LLM API keys
        llm_providers=0
        if [ ! -z "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "your_claude_api_key_here" ]; then
            print_success "Claude API key configured"
            ((llm_providers++))
        fi
        
        if [ ! -z "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "your_openai_api_key_here" ]; then
            print_success "OpenAI API key configured"
            ((llm_providers++))
        fi
        
        if [ ! -z "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "your_gemini_api_key_here" ]; then
            print_success "Google Gemini API key configured"
            ((llm_providers++))
        fi
        
        if [ $llm_providers -eq 0 ]; then
            print_warning "No LLM API keys configured. Add API keys to .env for full functionality"
        else
            print_success "$llm_providers LLM provider(s) configured"
        fi
    fi
}

# Function to check Ollama (local LLM)
check_ollama() {
    print_status "Checking for Ollama (local LLM support)..."
    
    if command_exists ollama; then
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            models=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -3)
            if [ ! -z "$models" ]; then
                print_success "Ollama is running with models: $(echo $models | tr '\n' ', ' | sed 's/,$//')"
            else
                print_warning "Ollama is running but no models are installed"
                print_status "Install models with: ollama pull llama3.2"
            fi
        else
            print_warning "Ollama is installed but not running"
            print_status "Start Ollama with: ollama serve"
        fi
    else
        print_status "Ollama not found - install from https://ollama.ai for local LLM support"
    fi
}

# Function to check Firebase setup
check_firebase() {
    if [ -f "firebase.json" ]; then
        print_status "Firebase configuration detected"
        
        if command_exists firebase; then
            print_success "Firebase CLI available"
        else
            print_warning "Firebase CLI not found - install with: npm install -g firebase-tools"
        fi
    fi
}

# Function to run type checking
run_typecheck() {
    print_status "Running TypeScript type checking..."
    if npm run typecheck; then
        print_success "TypeScript compilation successful"
    else
        print_warning "TypeScript errors detected - continuing anyway"
    fi
}

# Function to start the application
start_application() {
    local mode=$1
    local port=${2:-$DEFAULT_PORT}
    
    # Check if port is in use
    if port_in_use $port; then
        print_error "Port $port is already in use"
        print_status "Kill the process using: lsof -ti:$port | xargs kill -9"
        exit 1
    fi
    
    print_status "Starting Leo Runner in $mode mode on port $port..."
    
    case $mode in
        "development"|"dev")
            export NODE_ENV=development
            export NEXT_TURBOPACK=1
            print_status "Using Turbopack for faster development builds"
            
            # Start with concurrently if AI services are needed
            if [ -f "src/ai/dev.ts" ]; then
                print_status "Starting with AI services..."
                npm run dev:ai
            else
                npm run dev
            fi
            ;;
        "production"|"prod")
            export NODE_ENV=production
            print_status "Building for production..."
            npm run build
            print_status "Starting production server..."
            npm run start
            ;;
        "build")
            print_status "Building application..."
            npm run build
            print_success "Build completed successfully"
            ;;
        "test")
            print_status "Running tests..."
            npm run test:ci
            ;;
        *)
            print_error "Unknown mode: $mode"
            show_help
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Leo Runner Startup Script"
    echo ""
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo ""
    echo "Modes:"
    echo "  dev, development    Start in development mode with hot reload (default)"
    echo "  prod, production    Build and start in production mode"
    echo "  build              Build the application only"
    echo "  test               Run tests"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT    Specify port number (default: $DEFAULT_PORT)"
    echo "  -h, --help         Show this help message"
    echo "  --skip-checks      Skip dependency and environment checks"
    echo ""
    echo "Examples:"
    echo "  $0                 Start in development mode"
    echo "  $0 dev -p 3000     Start in development mode on port 3000"
    echo "  $0 prod            Build and start in production mode"
    echo "  $0 build           Build the application"
    echo ""
    echo "Environment Setup:"
    echo "  1. Copy .env.example to .env"
    echo "  2. Add your API keys to .env file"
    echo "  3. Install Ollama for local LLM support (optional)"
    echo ""
}

# Parse command line arguments
MODE="development"
PORT=$DEFAULT_PORT
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|development)
            MODE="development"
            shift
            ;;
        prod|production)
            MODE="production"
            shift
            ;;
        build)
            MODE="build"
            shift
            ;;
        test)
            MODE="test"
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo ""
    print_status "=== Leo Runner Startup ==="
    print_status "Mode: $MODE"
    print_status "Port: $PORT"
    print_status "Environment: $NODE_ENV"
    echo ""
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    if [ "$SKIP_CHECKS" = false ]; then
        check_node_version
        check_dependencies
        check_environment
        check_ollama
        check_firebase
        
        if [ "$MODE" != "build" ] && [ "$MODE" != "test" ]; then
            run_typecheck
        fi
    fi
    
    echo ""
    start_application "$MODE" "$PORT"
}

# Handle Ctrl+C gracefully
trap 'print_status "Shutting down..."; exit 0' SIGINT SIGTERM

# Run main function
main "$@"