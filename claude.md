# ACAS Windows Implementation Guide - Claude Code Edition

This guide is designed for users with **Claude Code** access, which can handle the technical implementation automatically while you focus on configuration and usage.

## Core Architecture (Automated via Claude Code)

**Database Solution**: SQLite-vec for native Windows support and code embedding storage
**Local Model Platform**: LM Studio with Windows optimization and CUDA 12.8 support  
**Embedding Model**: Nomic Embed Text v1.5 (1-2GB VRAM, optimized for code)

## Prerequisites (Manual Setup Required)

**System Requirements**
- Windows 10/11 with 8GB VRAM + 32GB RAM
- NVIDIA GPU (RTX 20-series or newer)
- 50GB free SSD space
- Admin access for initial setup

**Step 1: Install Dependencies**
```powershell
# Install via winget (run as admin)
winget install Python.Python.3.11
winget install Microsoft.WindowsTerminal
winget install Git.Git
```

**Step 2: LM Studio Setup**
1. Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Launch LM Studio → Search for "nomic-embed-text-v1.5"
3. Download the GGUF model (should be ~500MB)
4. Start the local server (port 1234) with the embedding model loaded

## Claude Code Implementation Tasks

Once you have Claude Code access, provide these instructions to automate the entire ACAS system setup:

### Task 1: Project Structure Creation
```
Create a complete ACAS project structure with:
- Python virtual environment setup
- FastAPI backend with embedding endpoints
- SQLite-vec database initialization
- File system monitoring service
- VS Code extension scaffolding
- Configuration management system
- Logging and error handling
- Windows service wrapper
```

### Task 2: Core Implementation
```
Implement the following components:

1. EMBEDDING SERVICE:
   - Connect to LM Studio API (localhost:1234)
   - Batch processing for multiple files
   - Error handling and retry logic
   - Performance monitoring

2. VECTOR DATABASE:
   - SQLite-vec schema with metadata
   - Binary quantization for storage efficiency
   - CRUD operations for embeddings
   - Search functionality with filtering

3. CODE ANALYSIS PIPELINE:
   - Tree-sitter integration for parsing
   - Function/class boundary detection
   - Language-specific chunking strategies
   - Incremental indexing system

4. FILE MONITORING:
   - Watchdog implementation for Windows
   - Debounced update handling
   - Change detection via file hashing
   - Batch processing for efficiency
```

### Task 3: API Layer Development
```
Create FastAPI application with:
- OpenAI-compatible embedding endpoints
- RESTful search API with filters
- WebSocket support for real-time updates
- Rate limiting and authentication
- Comprehensive error responses
- Health check endpoints
- Swagger documentation
```

### Task 4: VS Code Extension
```
Build VS Code extension with:
- TypeScript/JavaScript implementation
- Language Server Protocol integration
- Real-time code completion
- Context-aware suggestions
- Search interface panel
- Configuration settings UI
- Status bar indicators
```

### Task 5: Windows Integration
```
Implement Windows-specific features:
- Windows Service registration
- Startup automation
- Registry configuration
- Windows Defender exclusions script
- Performance optimization utilities
- System tray application
- Installer package (NSIS or WiX)
```

### Task 6: Configuration System
```
Create configuration management:
- YAML/JSON config files
- Environment variable support
- Project-specific settings
- Model path management
- GPU optimization settings
- Logging configuration
- Performance tuning parameters
```

### Task 7: Testing and Validation
```
Implement comprehensive testing:
- Unit tests for all components
- Integration tests for API endpoints
- Performance benchmarks
- Memory usage monitoring
- GPU utilization tests
- File system stress tests
- Windows compatibility validation
```

## User Configuration Steps (Post-Implementation)

After Claude Code completes the implementation, you'll need to:

**Step 1: Environment Configuration**
```powershell
# Navigate to project directory
cd acas-system

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (should be automated)
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# Edit .env with your paths and settings
```

**Step 2: Windows Optimization**
```powershell
# Run automated Windows optimization script
.\scripts\optimize-windows.ps1

# Add Windows Defender exclusions
.\scripts\setup-defender-exclusions.ps1

# Configure GPU settings
.\scripts\optimize-gpu.ps1
```

**Step 3: Database Initialization**
```powershell
# Initialize vector database
python -m acas.database.init

# Test embedding generation
python -m acas.test.embeddings

# Verify LM Studio connection
python -m acas.test.api_connectivity
```

**Step 4: Service Installation**
```powershell
# Install as Windows service
.\scripts\install-service.ps1

# Start ACAS service
net start acas-service

# Verify service status
.\scripts\check-service-status.ps1
```

**Step 5: VS Code Extension**
```powershell
# Install extension from local package
code --install-extension ./extensions/acas-extension.vsix

# Configure extension settings
# Open VS Code → Settings → Extensions → ACAS
```

## Usage Workflow (Automated)

**Initial Project Indexing**
1. Open VS Code in your project directory
2. Command palette → "ACAS: Index Current Project"
3. Monitor progress in output panel
4. Test search functionality

**Daily Development**
- ACAS runs automatically as background service
- Real-time file monitoring and indexing
- Context-aware code completion in VS Code
- Semantic search via command palette

**Maintenance**
- Automated weekly optimization
- Model updates via LM Studio
- Log rotation and cleanup
- Performance monitoring dashboard

## Claude Code Prompt Templates

Use these specific prompts when working with Claude Code:

**For Initial Setup:**
```
I need you to create a complete AI Coding Assistant System (ACAS) for Windows. Please implement:

1. A FastAPI backend that connects to LM Studio (localhost:1234) for embeddings
2. SQLite-vec database for vector storage with metadata
3. File system monitoring for real-time indexing
4. VS Code extension for code completion
5. Windows service wrapper for background operation

Requirements:
- Support for multiple programming languages
- Efficient memory usage (8GB VRAM constraint)
- Production-ready error handling
- Comprehensive configuration system
- Windows-specific optimizations

Please create the complete project structure and implement all components.
```

**For Troubleshooting:**
```
My ACAS system is experiencing [specific issue]. Please:
1. Diagnose the problem by checking logs and configuration
2. Implement fixes for the identified issues
3. Add monitoring to prevent future occurrences
4. Update documentation with troubleshooting steps

System details: [provide error messages, logs, system specs]
```

**For Feature Enhancement:**
```
Please enhance my ACAS system with [specific feature]:
- Analyze current codebase structure
- Implement the new feature with proper integration
- Add configuration options and documentation
- Create tests to validate functionality
- Update VS Code extension if needed
```

## Expected Performance and Outcomes

**System Performance** (Automated monitoring via Claude Code)
- Embedding generation: 75+ vectors/second
- Search latency: <500ms response times
- Memory usage: 6-8GB total system usage
- VRAM utilization: 2-3GB for embedding model

**Development Benefits**
- Context-aware code completion
- Semantic search across entire codebase
- Pattern recognition for debugging
- Automatic documentation discovery
- Cross-project code reuse identification

**Maintenance Overhead**
- Initial setup with Claude Code: 1-2 hours (mostly automated)
- Daily maintenance: Fully automated
- Updates and optimization: Handled by Claude Code on request

## Advanced Claude Code Tasks

**Multi-Project Management:**
```
Extend ACAS to handle multiple projects with:
- Project isolation and switching
- Shared model instances for efficiency
- Project-specific configurations
- Cross-project search capabilities
```

**Team Deployment:**
```
Create team deployment package with:
- Centralized model serving
- Shared vector database
- User authentication system
- Usage analytics dashboard
- Configuration management
```

**Custom Integrations:**
```
Integrate ACAS with [specific tools]:
- API endpoints for external tools
- Custom embedding models
- Specialized code analysis
- Integration testing suite
```

This approach leverages Claude Code's direct system access to handle all the complex implementation details while you focus on configuration and usage. The system becomes a powerful, automated coding assistant tailored specifically for your Windows development environment.