# Claude-step1-CoreCleanup.md

**Objective:** Clean up mock implementations and unused analytics components in
the ACAS Runner.

**Full Filepath:** `docs/development/Claude-step1-CoreCleanup.md`

## Instructions:

Familiarize yourself with the current state of analytics and mock data within
the project.

For each task, ensure that the removal or replacement of code is done carefully
to avoid breaking existing functionalities, even if they are currently mocked.

## Tasks:

### 1. Remove Analytics Bloat

- **Action:** Delete the analytics services and API routes.
- **Details:**
  - [span_0](start_span)Remove the `src/services/analytics/`
    directory.[span_0](end_span)
  - [span_1](start_span)Remove the `src/app/api/analytics/`
    directory.[span_1](end_span)

### 2. Clean Mock Implementations

- **Action:** Replace placeholder data and mock responses with real
  implementations where applicable.
- **Details:**
  - [span_2](start_span)Update `src/services/llm-providers/provider-manager.ts`
    to remove any mock responses.[span_2](end_span)
  - [span_3](start_span)Update `src/services/escalation-manager.ts` to remove
    mock data generators.[span_3](end_span)
  - [span_4](start_span)[span_5](start_span)Review and replace placeholder
    responses in the AI flows located in `src/ai/flows/` (e.g.,
    `escalate-coding-problem.ts`, `generate-documentation-flow.ts`,
    `real-time-ai-trace.ts`,
    `suggest-code-fixes-flow.ts`).[span_4](end_span)[span_5](end_span)

### 3. Streamline Plugin Registry

- **Action:** Remove example plugins to keep only the core plugin
  infrastructure.
- **Details:**
  - [span_6](start_span)Modify `src/services/plugin-system/plugin-registry.ts`
    to remove references to or implementations of generic example
    plugins.[span_6](end_span)

## Reminder:

This step is critical as it forms the foundation for all subsequent Claude Code
integrations. The goal is to establish a clean and robust base.

# ACAS Windows Implementation Guide

Based on comprehensive research of database options, local models, technical
implementation patterns, and Windows-specific considerations, here are the
optimal solutions for setting up an AI Coding Assistant System on Windows with
8GB VRAM + 32GB RAM constraints.

## Core Architecture Recommendations

**Database Solution**: SQLite-vec emerges as the optimal choice for Windows ACAS
implementation, offering native Windows support, minimal setup complexity, and
features specifically suited for code embedding storage and search.

**Local Model Platform**: LM Studio is recommended over Ollama due to superior
Windows integration, comprehensive GUI interface, and optimized CUDA 12.8
support for RTX GPUs.

**Embedding Model**: Nomic Embed Text v1.5 provides the best balance of
performance, VRAM efficiency (~1-2GB), and code understanding capabilities.

## Technical Implementation Plan (Claude.md)

### Architecture Overview

The ACAS system consists of four primary components:

**Embedding Generation Layer**

- LM Studio running Nomic Embed Text v1.5 (GGUF format)
- OpenAI-compatible REST API on localhost:1234
- Supports 768-dimensional embeddings with Matryoshka scaling
- Expected performance: 75+ embeddings/second with 2-3GB VRAM usage

**Vector Storage Layer**

- SQLite-vec for high-performance vector operations
- Binary quantization for 32x storage reduction
- Metadata filtering for file types, projects, and languages
- Real-time indexing with ACID compliance

**Code Analysis Pipeline**

- Tree-sitter parsers for language-specific code understanding
- Function/class boundary detection with context preservation
- Incremental indexing with file system monitoring
- Batch processing for large codebases

**API and Interface Layer**

- FastAPI-based REST endpoints for search and indexing
- WebSocket support for real-time updates
- VS Code extension integration patterns
- Optional desktop interface using Tauri

### Database Schema Design

```sql
CREATE VIRTUAL TABLE code_embeddings USING vec0(
    file_id TEXT PRIMARY KEY,
    code_embedding FLOAT[384],  -- Binary quantized
    file_type TEXT,
    language TEXT,
    project_id TEXT,
    last_modified INTEGER,
    -- Auxiliary columns for source storage
    +source_code TEXT,
    +file_path TEXT,
    +function_name TEXT,
    +context_info TEXT
);
```

### Real-Time Indexing Implementation

The system uses Windows-native file system monitoring with debounced updates:

**File Watcher**: Watchdog with Windows-specific optimizations for NTFS
**Processing Pipeline**: Async processing with ThreadPoolExecutor for
CPU-intensive tasks **Update Strategy**: Incremental updates with hash-based
change detection **Error Handling**: Retry mechanisms with exponential backoff

### Performance Optimization Strategies

**Memory Management**

- Connection pooling for database operations
- Embedding cache with LRU eviction
- Batch processing for multiple file updates
- Memory monitoring with automatic garbage collection

**GPU Utilization**

- CUDA graph enablement (35% throughput improvement)
- Flash attention optimization (15% performance boost)
- Mixed precision inference (FP16)
- Automatic VRAM management

**Windows-Specific Optimizations**

- Windows Defender exclusions for performance
- NVIDIA Control Panel GPU optimization
- Virtual memory configuration for large models
- Process priority and affinity settings

### Integration Patterns

**VS Code Extension Architecture**

- TypeScript extension with Python backend
- Real-time code completion via Language Server Protocol
- Context-aware suggestions based on current file
- Configurable search scopes and filters

**API Design**

- OpenAI-compatible endpoints for easy integration
- RESTful architecture with async/await patterns
- Rate limiting and authentication support
- Comprehensive error handling and logging

## Human-Friendly Setup Guide (human.md)

### Prerequisites and Installation

**System Requirements**

- Windows 10/11 with 8GB VRAM + 32GB RAM
- NVIDIA GPU with RTX 20-series or newer
- 50GB free SSD space for models and data
- Python 3.11+ (for optimal SQLite compatibility)

**Step 1: Environment Setup**

1. Install Python 3.11 via winget: `winget install Python.Python.3.11`
1. Install Windows Terminal: `winget install Microsoft.WindowsTerminal`
1. Configure PowerShell 7 as default shell
1. Set up project directory with virtual environment

**Step 2: LM Studio Installation**

1. Download LM Studio installer from lmstudio.ai
1. Install with standard Windows procedure (no admin required)
1. Launch application and configure GPU settings
1. Enable CUDA acceleration and Flash Attention
1. Download Nomic Embed Text v1.5 model from built-in browser

**Step 3: Database Setup**

1. Install SQLite-vec: `pip install sqlite-vec`
1. Verify installation with simple test script
1. Create initial database schema for code embeddings
1. Configure metadata indexes for efficient filtering

**Step 4: ACAS Service Installation**

1. Clone ACAS repository or create new project
1. Install dependencies: `pip install -r requirements.txt`
1. Configure environment variables for model paths
1. Test API connectivity with LM Studio
1. Initialize vector database with sample code

### Configuration and Optimization

**Windows Defender Exclusions**

- Add Python installation directory
- Exclude project workspace folders
- Add model cache directories
- Configure via PowerShell or Windows Security GUI

**GPU Optimization**

- NVIDIA Control Panel: Set “Prefer maximum performance”
- Configure CUDA environment variables
- Monitor GPU utilization with Task Manager
- Adjust model offloading based on VRAM usage

**Performance Tuning**

- Virtual memory: Set to 1.5x RAM initial size
- File system: Enable long path support
- Network: Configure Windows Firewall for localhost APIs
- Process priority: Set to “High” for AI processes

### Usage Patterns and Workflows

**Initial Codebase Indexing**

1. Point ACAS to project directory
1. Configure file type filters (.py, .js, .java, etc.)
1. Start batch indexing process
1. Monitor progress via web interface or logs
1. Verify search functionality with test queries

**Daily Development Workflow**

1. ACAS runs as background service
1. Real-time indexing of file changes
1. VS Code extension provides inline suggestions
1. Search interface for code exploration
1. Context-aware assistance for debugging

**Maintenance and Updates**

- Weekly model updates via LM Studio
- Monthly database optimization
- Regular backup of vector database
- Monitor system performance and logs

### Troubleshooting Common Issues

**Installation Problems**

- Python SQLite version conflicts: Use Python 3.11+
- CUDA not detected: Verify driver installation
- Port conflicts: Check for conflicting services on 1234/11434
- Permission errors: Run package managers as administrator

**Performance Issues**

- Slow embedding generation: Check GPU utilization
- High memory usage: Adjust batch sizes and caching
- File watching failures: Check Windows file system limits
- API timeouts: Increase request timeout values

**Windows-Specific Fixes**

- Long path errors: Enable via Group Policy
- Antivirus interference: Add exclusions
- Service startup failures: Check Windows Event Log
- Network access issues: Configure firewall rules

### Scaling and Advanced Configuration

**Multi-Project Setup**

- Partition keys for project isolation
- Shared model instances for efficiency
- Project-specific metadata schemas
- Role-based access control

**Team Deployment**

- Centralized model serving
- Shared vector database instances
- Configuration management
- Usage monitoring and analytics

**Integration Options**

- VS Code extension for real-time assistance
- JetBrains IDE plugins via Language Server Protocol
- Web interface for code exploration
- API integration with existing tools

## Expected Performance and Outcomes

**System Performance**

- Embedding generation: 75+ vectors/second
- Search latency: Sub-second response times
- Memory usage: 6-8GB total (including OS)
- VRAM utilization: 2-3GB for embedding model

**Development Benefits**

- Context-aware code suggestions
- Semantic code search across projects
- Pattern recognition for debugging assistance
- Documentation and example discovery

**Maintenance Overhead**

- Initial setup: 4-6 hours
- Daily maintenance: Minimal (automated)
- Weekly updates: 30 minutes
- Monthly optimization: 1-2 hours

This implementation provides a robust, performant AI coding assistant system
optimized for Windows development environments while maintaining the simplicity
that coding hobbyists require. The architecture balances functionality with
resource efficiency, ensuring smooth operation within the specified hardware
constraints.

# Claude-step2-PluginCore.md

**Objective:** Implement a minimal Claude Code plugin with core monitoring and
escalation capabilities.

**Full Filepath:** `docs/development/Claude-step2-PluginCore.md`

## Instructions:

This phase focuses on getting the essential components of the Claude Code plugin
operational. [span_7](start_span)Refer to `src/plugins/claude-code/index.ts` for
the plugin structure[span_7](end_span).

## Tasks:

### 1. Implement Claude Code Process Detection

- **Action:** Develop logic to detect active Claude Code processes.
- **[span_8](start_span)Details:** This is a foundational element mentioned in
  the "Quick Win Implementation" for the Claude Code plugin.[span_8](end_span)

### 2. Monitor File Changes in `.claude/` Directories

- **Action:** Set up a file system monitor specifically for `.claude/`
  directories.
- **[span_9](start_span)Details:** This will enable the plugin to react to
  changes in Claude Code-related configuration or output
  files.[span_9](end_span)

### 3. Implement Error Pattern Escalation

- **Action:** Integrate the plugin with the existing escalation system to
  trigger on detected error patterns.
- **Details:**
  - [span_10](start_span)Leverage the `ClaudeCodeEscalationHandler`
    component.[span_10](end_span)
  - [span_11](start_span)Ensure error patterns are recognized and escalate
    appropriately.[span_11](end_span)
  - [span_12](start_span)Refer to `escalation-struggle-system.txt` for examples
    of JSON configuration for error types (e.g., "api-timeout-error" with
    `plugin_specific: ["claude-code"]`) and `model_preferences` (e.g.,
    `primary: "claude-3-5-sonnet"`).[span_12](end_span)

### 4. Store Basic Session Metadata

- **Action:** Implement storage for essential session metadata related to Claude
  Code interactions.
- **[span_13](start_span)Details:** This is crucial for tracking and analyzing
  Claude Code's usage and performance.[span_13](end_span)
  [span_14](start_span)The `ClaudeCodeHistoryManager` is responsible for storing
  and indexing activity.[span_14](end_span)

### 5. Enhance Search Capabilities for History

- **Action:** Investigate integrating Ollama for semantic search of activity
  history.
- **[span_15](start_span)Details:** The current `historyManager` notes that
  search is "Simple text-based search for now" and recommends "integrate with
  Ollama for semantic search" in the future.[span_15](end_span)

## Integration Points:

- **[span_16](start_span)Plugin System:** Ensure seamless integration with
  `src/services/plugin-system/`.[span_16](end_span)
- **[span_17](start_span)Activity Monitoring:** Utilize
  `src/services/client-activity-service.ts` for real-time
  events.[span_17](end_span)
- **[span_18](start_span)Escalation Management:** Use
  `src/services/escalation-manager.ts` for AI escalation.[span_18](end_span)
- **[span_19](start_span)AI Providers:** Interact with
  `src/services/llm-providers/` for AI access.[span_19](end_span)

## Reminder:

Keep all stubs minimal. Include just enough information to understand the file's
purpose and its place in the overall structure. Do not implement any actual
logic or detailed code beyond what's necessary for the stub.

---

I've created two task files for Phase 2: `Claude-step1-CoreCleanup.md` and
`Claude-step2-PluginCore.md`.

Would you like to see the content of any specific stubbed files, or are you
ready for further steps in the development process?
