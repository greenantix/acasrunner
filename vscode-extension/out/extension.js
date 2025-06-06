"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const leo_connection_1 = require("./communication/leo-connection");
const activity_monitor_1 = require("./monitoring/activity-monitor");
const ai_assistant_1 = require("./ai/ai-assistant");
const workflow_manager_1 = require("./workflows/workflow-manager");
const completion_provider_1 = require("./providers/completion-provider");
const hover_provider_1 = require("./providers/hover-provider");
const tree_data_provider_1 = require("./providers/tree-data-provider");
let leoConnection;
let activityMonitor;
let aiAssistant;
let workflowManager;
function activate(context) {
    console.log('leo Runner extension is now active!');
    // Initialize core services
    leoConnection = new leo_connection_1.leoConnection();
    activityMonitor = new activity_monitor_1.ActivityMonitor(leoConnection);
    aiAssistant = new ai_assistant_1.AIAssistant(leoConnection);
    workflowManager = new workflow_manager_1.WorkflowManager(leoConnection);
    // Register commands
    registerCommands(context);
    // Register providers
    registerProviders(context);
    // Setup auto-connect if enabled
    const config = vscode.workspace.getConfiguration('leo');
    if (config.get('autoConnect')) {
        leoConnection.connect();
    }
    // Start activity monitoring if enabled
    if (config.get('monitorActivity')) {
        activityMonitor.start();
    }
    // Set initial context
    vscode.commands.executeCommand('setContext', 'leo:connected', false);
}
function registerCommands(context) {
    // Connection commands
    let connectCommand = vscode.commands.registerCommand('leo.connect', async () => {
        try {
            await leoConnection.connect();
            vscode.window.showInformationMessage('Connected to leo Runner');
            vscode.commands.executeCommand('setContext', 'leo:connected', true);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect to leo Runner: ${error}`);
        }
    });
    let disconnectCommand = vscode.commands.registerCommand('leo.disconnect', async () => {
        try {
            await leoConnection.disconnect();
            vscode.window.showInformationMessage('Disconnected from leo Runner');
            vscode.commands.executeCommand('setContext', 'leo:connected', false);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to disconnect: ${error}`);
        }
    });
    // Dashboard command
    let openDashboardCommand = vscode.commands.registerCommand('leo.openDashboard', () => {
        const config = vscode.workspace.getConfiguration('leo');
        const serverUrl = config.get('serverUrl');
        vscode.env.openExternal(vscode.Uri.parse(serverUrl));
    });
    // AI commands
    let askAICommand = vscode.commands.registerCommand('leo.askAI', async () => {
        const question = await vscode.window.showInputBox({
            prompt: 'What would you like to ask the AI assistant?',
            placeHolder: 'e.g., How can I optimize this function?'
        });
        if (question) {
            try {
                const answer = await aiAssistant.ask(question);
                vscode.window.showInformationMessage(answer);
            }
            catch (error) {
                vscode.window.showErrorMessage(`AI request failed: ${error}`);
            }
        }
    });
    let analyzeCodeCommand = vscode.commands.registerCommand('leo.analyzeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const code = editor.document.getText(selection.isEmpty ? undefined : selection);
        try {
            const analysis = await aiAssistant.analyzeCode(code, editor.document.languageId);
            showAnalysisResult(analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code analysis failed: ${error}`);
        }
    });
    // Workflow commands
    let runWorkflowCommand = vscode.commands.registerCommand('leo.runWorkflow', async () => {
        try {
            const workflows = await workflowManager.getAvailableWorkflows();
            const selected = await vscode.window.showQuickPick(workflows.map(w => ({ label: w.name, description: w.description, id: w.id })), { placeHolder: 'Select a workflow to run' });
            if (selected) {
                await workflowManager.runWorkflow(selected.id);
                vscode.window.showInformationMessage(`Workflow "${selected.label}" started`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to run workflow: ${error}`);
        }
    });
    // Activity command
    let showActivityCommand = vscode.commands.registerCommand('leo.showActivity', () => {
        activityMonitor.showActivityPanel();
    });
    // Register all commands
    context.subscriptions.push(connectCommand, disconnectCommand, openDashboardCommand, askAICommand, analyzeCodeCommand, runWorkflowCommand, showActivityCommand);
    // Setup event listeners
    setupEventListeners(context);
}
function registerProviders(context) {
    // Register completion provider for supported languages
    const completionProvider = new completion_provider_1.leoCompletionProvider(aiAssistant);
    const supportedLanguages = ['typescript', 'javascript', 'python', 'java', 'cpp', 'c'];
    supportedLanguages.forEach(language => {
        const disposable = vscode.languages.registerCompletionItemProvider(language, completionProvider, '.' // Trigger on dot
        );
        context.subscriptions.push(disposable);
    });
    // Register hover provider
    const hoverProvider = new hover_provider_1.leoHoverProvider(aiAssistant);
    supportedLanguages.forEach(language => {
        const disposable = vscode.languages.registerHoverProvider(language, hoverProvider);
        context.subscriptions.push(disposable);
    });
    // Register tree data providers
    const activityTreeProvider = new tree_data_provider_1.leoActivityTreeDataProvider(leoConnection);
    const workflowTreeProvider = new tree_data_provider_1.leoWorkflowTreeDataProvider(leoConnection);
    vscode.window.registerTreeDataProvider('leoActivityView', activityTreeProvider);
    vscode.window.registerTreeDataProvider('leoWorkflowsView', workflowTreeProvider);
    // Register refresh commands for tree views
    const refreshActivityCommand = vscode.commands.registerCommand('leo.refreshActivity', () => {
        activityTreeProvider.refresh();
    });
    const refreshWorkflowsCommand = vscode.commands.registerCommand('leo.refreshWorkflows', () => {
        workflowTreeProvider.refresh();
    });
    context.subscriptions.push(refreshActivityCommand, refreshWorkflowsCommand);
}
function setupEventListeners(context) {
    // File change events
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileWatcher.onDidCreate(uri => {
        activityMonitor.onFileChanged('created', uri.fsPath);
    });
    fileWatcher.onDidChange(uri => {
        activityMonitor.onFileChanged('modified', uri.fsPath);
    });
    fileWatcher.onDidDelete(uri => {
        activityMonitor.onFileChanged('deleted', uri.fsPath);
    });
    // Document change events
    vscode.workspace.onDidChangeTextDocument(event => {
        activityMonitor.onDocumentChanged(event);
    });
    // Window state changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            activityMonitor.onEditorChanged(editor);
        }
    });
    // Register disposables
    context.subscriptions.push(fileWatcher);
}
function showAnalysisResult(analysis) {
    const panel = vscode.window.createWebviewPanel('leoAnalysis', 'leo Code Analysis', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.webview.html = getAnalysisWebviewContent(analysis);
}
function getAnalysisWebviewContent(analysis) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>leo Code Analysis</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                .analysis-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                }
                .severity-high { border-left: 4px solid #f14c4c; }
                .severity-medium { border-left: 4px solid #ffcc02; }
                .severity-low { border-left: 4px solid #89d185; }
                h2 { margin-top: 0; }
                .suggestion { 
                    background: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 3px;
                }
            </style>
        </head>
        <body>
            <h1>🤖 AI Code Analysis</h1>
            
            <div class="analysis-section severity-${analysis.severity || 'low'}">
                <h2>📝 Summary</h2>
                <p>${analysis.explanation || 'Analysis completed successfully.'}</p>
            </div>

            ${analysis.suggestions ? `
                <div class="analysis-section">
                    <h2>💡 Suggestions</h2>
                    ${analysis.suggestions.map((suggestion) => `<div class="suggestion">${suggestion}</div>`).join('')}
                </div>
            ` : ''}

            ${analysis.trace ? `
                <div class="analysis-section">
                    <h2>🔍 Analysis Trace</h2>
                    <ul>
                        ${analysis.trace.map((step) => `<li>${step}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </body>
        </html>
    `;
}
function deactivate() {
    if (leoConnection) {
        leoConnection.disconnect();
    }
    if (activityMonitor) {
        activityMonitor.stop();
    }
}
//# sourceMappingURL=extension.js.map
