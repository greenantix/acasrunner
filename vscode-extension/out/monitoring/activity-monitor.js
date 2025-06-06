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
exports.ActivityMonitor = void 0;
const vscode = __importStar(require("vscode"));
class ActivityMonitor {
    constructor(leoConnection) {
        this.isMonitoring = false;
        this.activityPanel = null;
        this.leoConnection = leoConnection;
    }
    start() {
        if (this.isMonitoring) {
            return;
        }
        console.log('Starting activity monitoring...');
        this.isMonitoring = true;
        // Send initial connection event
        this.sendActivity({
            type: 'system_event',
            source: 'vscode-extension',
            message: 'VS Code extension connected',
            details: {
                severity: 'low',
                environment: 'vscode',
                workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            }
        });
    }
    stop() {
        this.isMonitoring = false;
        console.log('Stopped activity monitoring');
    }
    onFileChanged(changeType, filePath) {
        if (!this.isMonitoring) {
            return;
        }
        // Filter out irrelevant files
        if (this.shouldIgnoreFile(filePath)) {
            return;
        }
        this.sendActivity({
            type: 'file_change',
            source: 'vscode-file-watcher',
            message: `File ${changeType}: ${this.getRelativePath(filePath)}`,
            details: {
                filePath: filePath,
                changeType: changeType,
                severity: 'low',
                environment: 'vscode'
            }
        });
    }
    onDocumentChanged(event) {
        if (!this.isMonitoring) {
            return;
        }
        // Skip if no actual changes
        if (event.contentChanges.length === 0) {
            return;
        }
        // Calculate changes
        let linesAdded = 0;
        let linesRemoved = 0;
        for (const change of event.contentChanges) {
            const newLines = change.text.split('\n').length - 1;
            const removedLines = change.range.end.line - change.range.start.line;
            linesAdded += newLines;
            linesRemoved += removedLines;
        }
        this.sendActivity({
            type: 'user_action',
            source: 'vscode-editor',
            message: `Code edited: ${this.getRelativePath(event.document.fileName)}`,
            details: {
                filePath: event.document.fileName,
                linesChanged: {
                    added: linesAdded,
                    removed: linesRemoved
                },
                severity: 'low',
                environment: 'vscode',
                language: event.document.languageId
            }
        });
    }
    onEditorChanged(editor) {
        if (!this.isMonitoring) {
            return;
        }
        this.sendActivity({
            type: 'user_action',
            source: 'vscode-editor',
            message: `Opened file: ${this.getRelativePath(editor.document.fileName)}`,
            details: {
                filePath: editor.document.fileName,
                severity: 'low',
                environment: 'vscode',
                language: editor.document.languageId
            }
        });
    }
    onError(error, context) {
        this.sendActivity({
            type: 'error',
            source: 'vscode-extension',
            message: `VS Code error: ${error.message}`,
            details: {
                error: error.message,
                stack: error.stack,
                severity: 'medium',
                environment: 'vscode',
                ...context
            }
        });
    }
    showActivityPanel() {
        if (this.activityPanel) {
            this.activityPanel.reveal();
            return;
        }
        this.activityPanel = vscode.window.createWebviewPanel('leoActivity', 'leo Activity Monitor', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.activityPanel.webview.html = this.getActivityWebviewContent();
        this.activityPanel.onDidDispose(() => {
            this.activityPanel = null;
        });
        // Listen for activity updates
        this.leoConnection.onMessage(event => {
            if (event.type === 'activity' && this.activityPanel) {
                this.activityPanel.webview.postMessage({
                    type: 'activity_update',
                    data: event.data
                });
            }
        });
    }
    sendActivity(activity) {
        const activityEvent = {
            id: `vscode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...activity
        };
        this.leoConnection.send({
            type: 'activity',
            data: activityEvent
        });
    }
    shouldIgnoreFile(filePath) {
        const ignoredPatterns = [
            /node_modules/,
            /\.git/,
            /\.vscode/,
            /\.next/,
            /dist/,
            /build/,
            /\.DS_Store/,
            /\.log$/
        ];
        return ignoredPatterns.some(pattern => pattern.test(filePath));
    }
    getRelativePath(filePath) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return vscode.workspace.asRelativePath(filePath);
        }
        return filePath;
    }
    getActivityWebviewContent() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>leo Activity Monitor</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    .activity-item {
                        padding: 10px;
                        margin-bottom: 10px;
                        border-left: 3px solid var(--vscode-activityBarBadge-background);
                        background: var(--vscode-editor-background);
                        border-radius: 3px;
                    }
                    .activity-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 5px;
                    }
                    .activity-type {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 6px;
                        border-radius: 2px;
                        font-size: 0.8em;
                    }
                    .activity-time {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.8em;
                    }
                    .activity-message {
                        margin: 5px 0;
                    }
                    .activity-details {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.9em;
                    }
                    .severity-high { border-left-color: #f14c4c; }
                    .severity-medium { border-left-color: #ffcc02; }
                    .severity-low { border-left-color: #89d185; }
                    #activities {
                        max-height: 80vh;
                        overflow-y: auto;
                    }
                </style>
            </head>
            <body>
                <h1>🔍 leo Activity Monitor</h1>
                <div id="activities">
                    <p>Waiting for activity data...</p>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const activitiesContainer = document.getElementById('activities');
                    const activities = [];

                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'activity_update') {
                            addActivity(message.data);
                        }
                    });

                    function addActivity(activity) {
                        activities.unshift(activity);
                        
                        // Keep only last 50 activities
                        if (activities.length > 50) {
                            activities.splice(50);
                        }
                        
                        renderActivities();
                    }

                    function renderActivities() {
                        if (activities.length === 0) {
                            activitiesContainer.innerHTML = '<p>No activities yet...</p>';
                            return;
                        }

                        const html = activities.map(activity => {
                            const time = new Date(activity.timestamp).toLocaleTimeString();
                            const severity = activity.details?.severity || 'low';
                            
                            return \`
                                <div class="activity-item severity-\${severity}">
                                    <div class="activity-header">
                                        <span class="activity-type">\${activity.type}</span>
                                        <span class="activity-time">\${time}</span>
                                    </div>
                                    <div class="activity-message">\${activity.message}</div>
                                    \${activity.details ? \`<div class="activity-details">Source: \${activity.source}</div>\` : ''}
                                </div>
                            \`;
                        }).join('');

                        activitiesContainer.innerHTML = html;
                    }
                </script>
            </body>
            </html>
        `;
    }
}
exports.ActivityMonitor = ActivityMonitor;
//# sourceMappingURL=activity-monitor.js.map
