# VS Code Extension Setup

This directory contains the leo Runner VS Code extension that provides seamless integration between your IDE and the leo Runner platform.

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
code --install-extension leo-runner-extension-0.1.0.vsix
```

### 4. Configure Connection
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "leo"
3. Set the server URL to your leo Runner instance (default: `http://localhost:3000`)

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
- Use `Ctrl+Shift+P` and search for "leo" commands
- Test connectivity with "leo: Connect to leo Runner"

## Commands

| Command | Description |
|---------|-------------|
| `leo: Connect to leo Runner` | Establish connection to leo server |
| `leo: Disconnect from leo Runner` | Disconnect from leo server |
| `leo: Ask AI Assistant` | Ask the AI a question about your code |
| `leo: Analyze Current Code` | Get AI analysis of selected code |
| `leo: Run Workflow` | Execute an leo workflow |
| `leo: Show Activity Log` | Open activity monitoring panel |
| `leo: Open Dashboard` | Open leo web dashboard |

## Configuration

### Extension Settings

- `leo.serverUrl` - leo Runner server URL (default: `http://localhost:3000`)
- `leo.autoConnect` - Auto-connect on VS Code startup (default: `true`)
- `leo.monitorActivity` - Enable activity monitoring (default: `true`)
- `leo.aiProvider` - Default AI provider (default: `claude`)
- `leo.showInlineHints` - Show AI hints inline (default: `true`)

### Example settings.json
```json
{
  "leo.serverUrl": "http://localhost:3000",
  "leo.autoConnect": true,
  "leo.monitorActivity": true,
  "leo.aiProvider": "claude",
  "leo.showInlineHints": true
}
```

## Usage

### 1. Basic AI Assistance
1. Select code in your editor
2. Right-click and choose "leo: Analyze Code"
3. View AI analysis in the side panel

### 2. Quick Questions
1. Press `Ctrl+Shift+P`
2. Type "leo: Ask AI Assistant"
3. Enter your question and get instant answers

### 3. Workflow Execution
1. Press `Ctrl+Shift+P`
2. Type "leo: Run Workflow"
3. Select from available workflows
4. Monitor progress in the notification area

### 4. Activity Monitoring
- File changes are automatically tracked
- View activity in the leo Activity sidebar
- Real-time sync with web dashboard

## Building for Distribution

### 1. Package the Extension
```bash
npm install -g vsce
vsce package
```

### 2. Install the Package
```bash
code --install-extension leo-runner-extension-0.1.0.vsix
```

### 3. Publish (Optional)
```bash
vsce publish
```

## Troubleshooting

### Connection Issues
- Ensure leo Runner is running on the configured port
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
│   ├── communication/        # leo connection logic
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

The extension communicates with leo Runner via:
- **WebSocket**: Real-time events and notifications
- **REST API**: Command execution and data fetching
- **HTTP**: File uploads and configuration

## Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review leo Runner logs
3. Check VS Code extension logs
4. Create an issue with detailed reproduction steps

## Next Steps

After setting up the extension:
1. Configure your AI providers in leo Runner
2. Create custom workflows for your projects
3. Set up team collaboration features
4. Explore advanced automation options
