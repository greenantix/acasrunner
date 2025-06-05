# VS Code Extension Setup

This directory contains the ACAS Runner VS Code extension that provides seamless integration between your IDE and the ACAS Runner platform.

## Features

- 🔍 **Real-time Activity Monitoring** - Track file changes and coding activity
- 🤖 **AI Assistant Integration** - Get AI help directly in VS Code
- ⚡ **Workflow Automation** - Execute workflows from the command palette
- 📊 **Activity Dashboard** - View real-time activity in VS Code sidebar
- 💡 **Code Analysis** - AI-powered code suggestions and error analysis
- 🔄 **Bi-directional Sync** - Keep VS Code and web app in perfect sync

## Quick Setup

### 1. Install Dependencies
```bash
cd vscode-extension
npm install
```

### 2. Build the Extension
```bash
npm run compile
```

### 3. Install Locally
```bash
# Install the extension in VS Code
code --install-extension acas-runner-extension-0.1.0.vsix
```

### 4. Configure Connection
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "ACAS"
3. Set the server URL to your ACAS Runner instance (default: `http://localhost:3000`)

## Development Setup

### 1. Open in VS Code
```bash
cd vscode-extension
code .
```

### 2. Run in Debug Mode
- Press `F5` to launch Extension Development Host
- This opens a new VS Code window with the extension loaded

### 3. Test the Extension
- Open a project in the Extension Development Host
- Use `Ctrl+Shift+P` and search for "ACAS" commands
- Test connectivity with "ACAS: Connect to ACAS Runner"

## Commands

| Command | Description |
|---------|-------------|
| `ACAS: Connect to ACAS Runner` | Establish connection to ACAS server |
| `ACAS: Disconnect from ACAS Runner` | Disconnect from ACAS server |
| `ACAS: Ask AI Assistant` | Ask the AI a question about your code |
| `ACAS: Analyze Current Code` | Get AI analysis of selected code |
| `ACAS: Run Workflow` | Execute an ACAS workflow |
| `ACAS: Show Activity Log` | Open activity monitoring panel |
| `ACAS: Open Dashboard` | Open ACAS web dashboard |

## Configuration

### Extension Settings

- `acas.serverUrl` - ACAS Runner server URL (default: `http://localhost:3000`)
- `acas.autoConnect` - Auto-connect on VS Code startup (default: `true`)
- `acas.monitorActivity` - Enable activity monitoring (default: `true`)
- `acas.aiProvider` - Default AI provider (default: `claude`)
- `acas.showInlineHints` - Show AI hints inline (default: `true`)

### Example settings.json
```json
{
  "acas.serverUrl": "http://localhost:3000",
  "acas.autoConnect": true,
  "acas.monitorActivity": true,
  "acas.aiProvider": "claude",
  "acas.showInlineHints": true
}
```

## Usage

### 1. Basic AI Assistance
1. Select code in your editor
2. Right-click and choose "ACAS: Analyze Code"
3. View AI analysis in the side panel

### 2. Quick Questions
1. Press `Ctrl+Shift+P`
2. Type "ACAS: Ask AI Assistant"
3. Enter your question and get instant answers

### 3. Workflow Execution
1. Press `Ctrl+Shift+P`
2. Type "ACAS: Run Workflow"
3. Select from available workflows
4. Monitor progress in the notification area

### 4. Activity Monitoring
- File changes are automatically tracked
- View activity in the ACAS Activity sidebar
- Real-time sync with web dashboard

## Building for Distribution

### 1. Package the Extension
```bash
npm install -g vsce
vsce package
```

### 2. Install the Package
```bash
code --install-extension acas-runner-extension-0.1.0.vsix
```

### 3. Publish (Optional)
```bash
vsce publish
```

## Troubleshooting

### Connection Issues
- Ensure ACAS Runner is running on the configured port
- Check firewall settings
- Verify the server URL in settings

### Performance Issues
- Disable activity monitoring for large projects
- Adjust monitoring patterns in settings
- Check VS Code performance monitor

### Extension Not Loading
- Check VS Code Developer Console (`Help > Toggle Developer Tools`)
- Look for error messages in the extension logs
- Try reloading the window (`Ctrl+Shift+P` → "Reload Window")

## Development

### File Structure
```
vscode-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── communication/        # ACAS connection logic
│   ├── monitoring/          # Activity monitoring
│   ├── ai/                  # AI assistant features
│   └── workflows/           # Workflow management
├── package.json             # Extension manifest
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Adding New Features

1. **Add Command**: Update `package.json` contributions
2. **Implement Handler**: Add to `extension.ts`
3. **Create Service**: Add to appropriate subdirectory
4. **Test**: Use Extension Development Host
5. **Document**: Update README and commands

### API Integration

The extension communicates with ACAS Runner via:
- **WebSocket**: Real-time events and notifications
- **REST API**: Command execution and data fetching
- **HTTP**: File uploads and configuration

## Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review ACAS Runner logs
3. Check VS Code extension logs
4. Create an issue with detailed reproduction steps

## Next Steps

After setting up the extension:
1. Configure your AI providers in ACAS Runner
2. Create custom workflows for your projects
3. Set up team collaboration features
4. Explore advanced automation options