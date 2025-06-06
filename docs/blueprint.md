# **App Name**: leo Runner

## Core Features:

- Activity Monitor: Monitors developer activity, capturing errors, logs, and file edits in real-time.
- AI Escalation: Automatically escalates detected coding problems to configured AI models such as Claude, GPT, or local Ollama models.
- Plugin System: Supports a plugin system where users can drop .ts or .js files into a /plugins directory to extend available commands. Includes drag-and-drop plugin loader for easy installation.
- Chat Session Management: Saves and exports chat sessions in multiple formats, including Markdown, JSON, and plaintext.
- Theme System: Theme system allowing users to switch between 'Blueprint', 'Terminal', and 'ClaudeMode' themes.
- LLM Settings UI: Provides a UI to configure LLM settings such as model, temperature, API key, and base URL for each provider.
- Real-time AI Trace: Displays the system's decision-making process for each AI response, powered by an LLM tool, which can turn ripgrep output or plugin output into a single easy-to-understand output to display the tool selection, plugin chain, and overall system logic. This functionality aids in understanding how the system derives its solutions and assists with debugging.

## Style Guidelines:

- Primary color: Deep midnight blue (#2E3440) to reflect stability and focus, suitable for long work sessions.
- Background color: Soft grey (#ECEFF4) for a clean and unobtrusive workspace.
- Accent color: Muted teal (#8FBCBB) for highlights and interactive elements.
- Body and headline font: 'Inter' sans-serif for clear and modern text rendering.
- Use minimalist icons to represent different functionalities.
- Resizable sidebar and tabbed panel layout to manage screen real estate effectively.
- Subtle animations and transitions to provide feedback during user interactions.
