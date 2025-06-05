import * as vscode from 'vscode';
import { ACASConnection } from './communication/acas-connection';
import { ActivityMonitor } from './monitoring/activity-monitor';
import { AIAssistant } from './ai/ai-assistant';
import { WorkflowManager } from './workflows/workflow-manager';

let acasConnection: ACASConnection;
let activityMonitor: ActivityMonitor;
let aiAssistant: AIAssistant;
let workflowManager: WorkflowManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('ACAS Runner extension is now active!');

    // Initialize core services
    acasConnection = new ACASConnection();
    activityMonitor = new ActivityMonitor(acasConnection);
    aiAssistant = new AIAssistant(acasConnection);
    workflowManager = new WorkflowManager(acasConnection);

    // Register commands
    registerCommands(context);

    // Setup auto-connect if enabled
    const config = vscode.workspace.getConfiguration('acas');
    if (config.get('autoConnect')) {
        acasConnection.connect();
    }

    // Start activity monitoring if enabled
    if (config.get('monitorActivity')) {
        activityMonitor.start();
    }

    // Set initial context
    vscode.commands.executeCommand('setContext', 'acas:connected', false);
}

function registerCommands(context: vscode.ExtensionContext) {
    // Connection commands
    let connectCommand = vscode.commands.registerCommand('acas.connect', async () => {
        try {
            await acasConnection.connect();
            vscode.window.showInformationMessage('Connected to ACAS Runner');
            vscode.commands.executeCommand('setContext', 'acas:connected', true);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect to ACAS Runner: ${error}`);
        }
    });

    let disconnectCommand = vscode.commands.registerCommand('acas.disconnect', async () => {
        try {
            await acasConnection.disconnect();
            vscode.window.showInformationMessage('Disconnected from ACAS Runner');
            vscode.commands.executeCommand('setContext', 'acas:connected', false);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to disconnect: ${error}`);
        }
    });

    // Dashboard command
    let openDashboardCommand = vscode.commands.registerCommand('acas.openDashboard', () => {
        const config = vscode.workspace.getConfiguration('acas');
        const serverUrl = config.get('serverUrl') as string;
        vscode.env.openExternal(vscode.Uri.parse(serverUrl));
    });

    // AI commands
    let askAICommand = vscode.commands.registerCommand('acas.askAI', async () => {
        const question = await vscode.window.showInputBox({
            prompt: 'What would you like to ask the AI assistant?',
            placeHolder: 'e.g., How can I optimize this function?'
        });

        if (question) {
            try {
                const answer = await aiAssistant.ask(question);
                vscode.window.showInformationMessage(answer);
            } catch (error) {
                vscode.window.showErrorMessage(`AI request failed: ${error}`);
            }
        }
    });

    let analyzeCodeCommand = vscode.commands.registerCommand('acas.analyzeCode', async () => {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Code analysis failed: ${error}`);
        }
    });

    // Workflow commands
    let runWorkflowCommand = vscode.commands.registerCommand('acas.runWorkflow', async () => {
        try {
            const workflows = await workflowManager.getAvailableWorkflows();
            const selected = await vscode.window.showQuickPick(
                workflows.map(w => ({ label: w.name, description: w.description, id: w.id })),
                { placeHolder: 'Select a workflow to run' }
            );

            if (selected) {
                await workflowManager.runWorkflow(selected.id);
                vscode.window.showInformationMessage(`Workflow "${selected.label}" started`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run workflow: ${error}`);
        }
    });

    // Activity command
    let showActivityCommand = vscode.commands.registerCommand('acas.showActivity', () => {
        activityMonitor.showActivityPanel();
    });

    // Register all commands
    context.subscriptions.push(
        connectCommand,
        disconnectCommand,
        openDashboardCommand,
        askAICommand,
        analyzeCodeCommand,
        runWorkflowCommand,
        showActivityCommand
    );

    // Setup event listeners
    setupEventListeners(context);
}

function setupEventListeners(context: vscode.ExtensionContext) {
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

function showAnalysisResult(analysis: any) {
    const panel = vscode.window.createWebviewPanel(
        'acasAnalysis',
        'ACAS Code Analysis',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getAnalysisWebviewContent(analysis);
}

function getAnalysisWebviewContent(analysis: any): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ACAS Code Analysis</title>
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
                    ${analysis.suggestions.map((suggestion: string) => 
                        `<div class="suggestion">${suggestion}</div>`
                    ).join('')}
                </div>
            ` : ''}

            ${analysis.trace ? `
                <div class="analysis-section">
                    <h2>🔍 Analysis Trace</h2>
                    <ul>
                        ${analysis.trace.map((step: string) => `<li>${step}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </body>
        </html>
    `;
}

export function deactivate() {
    if (acasConnection) {
        acasConnection.disconnect();
    }
    if (activityMonitor) {
        activityMonitor.stop();
    }
}