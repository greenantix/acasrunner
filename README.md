leo Runner
AI-powered developer workflow automation system.
License: MIT
🚀 Overview
leo Runner (AI Coding Assistant Supervisor) is a comprehensive platform designed to streamline developer workflows through real-time monitoring, intelligent AI assistance, and automated orchestration. It provides insights into productivity and quality, offers AI-powered chat and code fixes, and allows for the creation of custom workflows to automate repetitive tasks.
📋 Table of Contents
 * Features
 * Quick Start
   * Prerequisites
   * Installation
   * With Claude Code Integration
 * Architecture
 * Available Scripts
 * AI Integration
 * Key Features
 * Documentation
 * Contributing
 * License
 * Acknowledgments
✨ Features
 * Activity Monitor: Real-time file and error monitoring with WebSocket-based live updates.
 * AI Escalation: Intelligent problem detection and routing to AI models for analysis and suggestions.
 * Plugin System: Extensible architecture for custom tools with secure sandbox execution.
 * Chat Integration: AI-powered conversations with context injection and session management.
 * Workflow Orchestration: Automated multi-step processes via a visual builder, multiple trigger types, and a comprehensive action library.
 * Code Diagnostics: Review detected issues and get AI-powered suggestions for fixes.
 * Real-time AI Trace: Understand the AI's decision-making process.
 * Analytics Dashboard: Insights and metrics for productivity, errors, and AI effectiveness.
 * WSL Terminal Integration: Experimental embedded terminal for direct WSL interaction.
🚀 Quick Start

## Prerequisites
- Node.js 18+
- npm (comes with Node.js)
- Firebase CLI (optional)
- Git

## One-Line Setup
```bash
git clone <repository-url> && cd leo-runner && ./setup.sh
```

## Manual Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd leo-runner
   ```

2. **Run the setup script:**
   ```bash
   ./setup.sh
   ```
   This will automatically install dependencies and set up your environment.

3. **Configure environment variables:**
   ```bash
   # Edit .env file with your API keys
   cp .env.example .env
   ```
   Add your API keys for LLM providers:
   - `ANTHROPIC_API_KEY` - For Claude models
   - `OPENAI_API_KEY` - For GPT models  
   - `GOOGLE_API_KEY` - For Gemini models

4. **Start the development server:**
   ```bash
   ./start.sh          # Full startup with health checks
   # OR
   ./start-dev.sh      # Quick development startup
   ```

## Startup Options

| Command | Description |
|---------|-------------|
| `./start.sh` | Full startup with dependency checks and health monitoring |
| `./start-dev.sh` | Quick development startup (fastest) |
| `./start.sh prod` | Production build and start |
| `./start.sh build` | Build application only |
| `./start.sh test` | Run tests |

## Windows Users
Use `start.bat` for Windows Command Prompt or PowerShell.

With Claude Code Integration
The project includes a setup script to configure your environment for Claude Code.
 * Setup Claude Code environment:
   npm run claude:setup

   This script will create necessary directories (e.g., src/claude-analysis, docs/claude-generated, .claude-cache), update .gitignore, and create a project analysis file.
 * Start with AI services:
   npm run dev:ai

 * Open workspace in VSCode:
   code leo-runner.code-workspace

🏗️ Architecture
leo Runner is built with a modular and extensible architecture, leveraging modern web technologies and AI frameworks.
Core Components
 * Frontend: Next.js 15 with Turbopack, React, TypeScript.
 * Styling: Tailwind CSS + shadcn/ui components.
 * AI Integration: Multiple providers (Claude, OpenAI, DeepSeek, Gemini) via Genkit framework.
 * Database: Firebase Firestore. (Neo4j is mentioned as optional/future in some mock data, but Firestore is actively used).
 * Monitoring: Integrated activity and error monitoring.
 * Backend: Firebase Functions + Custom services.
Project Structure
greenantix-leorunner/
├── src/                    # Main application source
│   ├── ai/                 # AI integration layer (Genkit flows, LLM configuration)
│   ├── app/                # Next.js app router pages and API routes
│   ├── components/         # Reusable React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries (Firebase, utils, websocket)
│   ├── plugins/            # Plugin examples and system interface
│   └── services/           # Business logic services (chat, escalation, orchestration, LLM providers)
├── functions/              # Firebase Functions (for backend logic)
├── public/                 # Static assets
├── scripts/                # Development and utility scripts
├── docs/                   # Documentation (claude-generated, etc.)
├── .claude/                # Claude Code specific configurations and caches
└── ...                     # Other configuration files (.nix, .gitignore, etc.)

🛠️ Available Scripts
 * npm run dev: Start development server.
 * npm run dev:ai: Start development server with AI services.
 * npm run build: Build for production.
 * npm run test: Run tests.
 * npm run lint: Lint code.
 * npm run format: Format code.
 * npm run type-check: TypeScript checking.
 * npm run claude:setup: Setup Claude Code integration.
 * npm run claude:analyze: Analyze project (mocked in analyze-project.js).
 * npm run claude:docs: Generate documentation.
🤖 AI Integration
leo Runner supports multiple AI providers to offer flexible and powerful assistance.
Supported Providers
 * Anthropic Claude: Primary AI provider for code analysis and escalation.
 * OpenAI GPT: Alternative provider for specialized tasks.
 * DeepSeek: Cost-effective option for large workloads (mentioned in mock data).
 * Google Gemini: Integrated via Genkit framework for various AI flows.
Configuration
Set up your API keys in the .env file for cloud-based providers.
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
GOOGLE_API_KEY=your_google_key
FIREBASE_API_KEY=your_firebase_key
FIREBASE_PROJECT_ID=your_firebase_project_id

Note: FIREBASE_API_KEY and FIREBASE_PROJECT_ID are also crucial for Firebase services.
Key Features
 * Activity Monitor Dashboard: Real-time monitoring of file changes, errors, user actions, and system events. Supports local and Firebase real-time streams.
 * AI Escalation System: Automatically detects and routes critical issues to AI models for analysis, providing explanations and suggestions.
 * Chat Assistant: Engage in multi-provider AI conversations, with context injection from activity streams and file attachments. Supports session management, branching, and export.
 * Code Diagnostics: Review detected project issues (errors, warnings) and get AI-powered suggestions for fixes.
 * Workflow Orchestration: Visually build and manage automated multi-step workflows. Supports various triggers (file change, schedule) and actions (file ops, AI ops, Git, shell).
 * Plugin Management: Install, enable, disable, and configure plugins to extend leo Runner's capabilities. Supports drag-and-drop installation of .ts, .js, or .zip plugin files.
 * Real-time AI Trace: Visualize and understand the AI's reasoning process with detailed steps, tools used, and plugin chains.
 * Analytics Dashboard: Provides insights into productivity, error trends, AI effectiveness, plugin usage, and workflow efficiency.
 * Chat Session Explorer: Browse, reopen, export, and delete past chat sessions.
 * Integrated Terminal (WSL): Embeds an xterm.js terminal with a WSL backend for direct command execution and activity logging.
📚 Documentation
 * API Documentation
 * Plugin Development Guide
 * AI Integration Guide
 * Deployment Guide
 * AI Trace Specification
 * Changelog
🤝 Contributing
We welcome contributions! Please follow these steps:
 * Fork the repository.
 * Create your feature branch (git checkout -b feature/your-feature-name).
 * Commit your changes following conventional commits.
 * Push to the branch.
 * Open a Pull Request.
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
🙏 Acknowledgments
 * Built with Next.js
 * AI integration via Genkit
 * UI components from shadcn/ui
 * Icons by Lucide
 * Terminal emulation by xterm.js
Generated by Gemini on 2025-06-05

