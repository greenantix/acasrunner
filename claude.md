## **Phase 2: Claude Code Integration \- Stubbed Project Structure**

We are now entering Phase 2 of the leo Runner app development process, focusing on integrating Claude Code. The initial task is to create a stubbed-out project structure and clean up existing mock implementations.

### **Claude-step1-CoreCleanup.md**

This file outlines the critical first step: cleaning up the core system by removing mock implementations and unused analytics components.  
`# Claude-step1-CoreCleanup.md`

`**Objective:** Clean up mock implementations and unused analytics components in the leo Runner.`

`` **Full Filepath:** `docs/development/Claude-step1-CoreCleanup.md` ``

`## Instructions:`

`Familiarize yourself with the current state of analytics and mock data within the project.`

`For each task, ensure that the removal or replacement of code is done carefully to avoid breaking existing functionalities, even if they are currently mocked.`

`## Tasks:`

`### 1. Remove Analytics Bloat`  
`* **Action:** Delete the analytics services and API routes.`  
`* **Details:**`  
    ``* [span_0](start_span)Remove the `src/services/analytics/` directory.[span_0](end_span)``  
    ``* [span_1](start_span)Remove the `src/app/api/analytics/` directory.[span_1](end_span)``

`### 2. Clean Mock Implementations`  
`* **Action:** Replace placeholder data and mock responses with real implementations where applicable.`  
`* **Details:**`  
    ``* [span_2](start_span)Update `src/services/llm-providers/provider-manager.ts` to remove any mock responses.[span_2](end_span)``  
    ``* [span_3](start_span)Update `src/services/escalation-manager.ts` to remove mock data generators.[span_3](end_span)``  
    ``* [span_4](start_span)[span_5](start_span)Review and replace placeholder responses in the AI flows located in `src/ai/flows/` (e.g., `escalate-coding-problem.ts`, `generate-documentation-flow.ts`, `real-time-ai-trace.ts`, `suggest-code-fixes-flow.ts`).[span_4](end_span)[span_5](end_span)``

`### 3. Streamline Plugin Registry`  
`* **Action:** Remove example plugins to keep only the core plugin infrastructure.`  
`* **Details:**`  
    ``* [span_6](start_span)Modify `src/services/plugin-system/plugin-registry.ts` to remove references to or implementations of generic example plugins.[span_6](end_span)``

`## Reminder:`

`This step is critical as it forms the foundation for all subsequent Claude Code integrations. The goal is to establish a clean and robust base.`

### **Claude-step2-PluginCore.md**

This file details the initial implementation tasks for the core Claude Code plugin, focusing on essential monitoring and escalation features.  
`# Claude-step2-PluginCore.md`

`**Objective:** Implement a minimal Claude Code plugin with core monitoring and escalation capabilities.`

`` **Full Filepath:** `docs/development/Claude-step2-PluginCore.md` ``

`## Instructions:`

``This phase focuses on getting the essential components of the Claude Code plugin operational. [span_7](start_span)Refer to `src/plugins/claude-code/index.ts` for the plugin structure[span_7](end_span).``

`## Tasks:`

`### 1. Implement Claude Code Process Detection`  
`* **Action:** Develop logic to detect active Claude Code processes.`  
`* **[span_8](start_span)Details:** This is a foundational element mentioned in the "Quick Win Implementation" for the Claude Code plugin.[span_8](end_span)`

``### 2. Monitor File Changes in `.claude/` Directories``  
``* **Action:** Set up a file system monitor specifically for `.claude/` directories.``  
`* **[span_9](start_span)Details:** This will enable the plugin to react to changes in Claude Code-related configuration or output files.[span_9](end_span)`

`### 3. Implement Error Pattern Escalation`  
`* **Action:** Integrate the plugin with the existing escalation system to trigger on detected error patterns.`  
`* **Details:**`  
    ``* [span_10](start_span)Leverage the `ClaudeCodeEscalationHandler` component.[span_10](end_span)``  
    `* [span_11](start_span)Ensure error patterns are recognized and escalate appropriately.[span_11](end_span)`  
    ``* [span_12](start_span)Refer to `escalation-struggle-system.txt` for examples of JSON configuration for error types (e.g., "api-timeout-error" with `plugin_specific: ["claude-code"]`) and `model_preferences` (e.g., `primary: "claude-3-5-sonnet"`).[span_12](end_span)``

`### 4. Store Basic Session Metadata`  
`* **Action:** Implement storage for essential session metadata related to Claude Code interactions.`  
``* **[span_13](start_span)Details:** This is crucial for tracking and analyzing Claude Code's usage and performance.[span_13](end_span) [span_14](start_span)The `ClaudeCodeHistoryManager` is responsible for storing and indexing activity.[span_14](end_span)``

`### 5. Enhance Search Capabilities for History`  
`* **Action:** Investigate integrating Ollama for semantic search of activity history.`  
``* **[span_15](start_span)Details:** The current `historyManager` notes that search is "Simple text-based search for now" and recommends "integrate with Ollama for semantic search" in the future.[span_15](end_span)``

`## Integration Points:`

``* **[span_16](start_span)Plugin System:** Ensure seamless integration with `src/services/plugin-system/`.[span_16](end_span)``  
``* **[span_17](start_span)Activity Monitoring:** Utilize `src/services/client-activity-service.ts` for real-time events.[span_17](end_span)``  
``* **[span_18](start_span)Escalation Management:** Use `src/services/escalation-manager.ts` for AI escalation.[span_18](end_span)``  
``* **[span_19](start_span)AI Providers:** Interact with `src/services/llm-providers/` for AI access.[span_19](end_span)``

`## Reminder:`

`Keep all stubs minimal. Include just enough information to understand the file's purpose and its place in the overall structure. Do not implement any actual logic or detailed code beyond what's necessary for the stub.`

`---`

``I've created two task files for Phase 2: `Claude-step1-CoreCleanup.md` and `Claude-step2-PluginCore.md`.``

`Would you like to see the content of any specific stubbed files, or are you ready for further steps in the development process?`  

