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
exports.WorkflowManager = void 0;
const vscode = __importStar(require("vscode"));
class WorkflowManager {
    constructor(leoConnection) {
        this.runningWorkflows = new Map();
        this.leoConnection = leoConnection;
        this.setupEventListeners();
    }
    async getAvailableWorkflows() {
        try {
            const response = await this.leoConnection.sendHTTP('workflows');
            return response.workflows || [];
        }
        catch (error) {
            throw new Error(`Failed to get workflows: ${error}`);
        }
    }
    async runWorkflow(workflowId, inputs) {
        try {
            const response = await this.leoConnection.sendHTTP(`workflows/${workflowId}/execute`, {
                inputs: inputs || {},
                source: 'vscode-extension'
            });
            const workflow = {
                id: response.executionId,
                name: response.workflowName,
                description: response.description || '',
                status: 'running',
                steps: response.steps || []
            };
            this.runningWorkflows.set(workflow.id, workflow);
            this.showWorkflowProgress(workflow);
        }
        catch (error) {
            throw new Error(`Failed to run workflow: ${error}`);
        }
    }
    async stopWorkflow(executionId) {
        try {
            await this.leoConnection.sendHTTP(`workflows/executions/${executionId}/stop`, {});
            const workflow = this.runningWorkflows.get(executionId);
            if (workflow) {
                workflow.status = 'failed';
                this.runningWorkflows.delete(executionId);
            }
            vscode.window.showInformationMessage(`Workflow stopped: ${workflow?.name || executionId}`);
        }
        catch (error) {
            throw new Error(`Failed to stop workflow: ${error}`);
        }
    }
    getRunningWorkflows() {
        return Array.from(this.runningWorkflows.values());
    }
    setupEventListeners() {
        this.leoConnection.onMessage(event => {
            if (event.type === 'workflow_status') {
                this.handleWorkflowStatusUpdate(event.data);
            }
        });
    }
    handleWorkflowStatusUpdate(data) {
        const { executionId, status, step, result, error } = data;
        const workflow = this.runningWorkflows.get(executionId);
        if (!workflow) {
            return;
        }
        // Update workflow status
        if (status) {
            workflow.status = status;
        }
        // Update step status
        if (step) {
            const workflowStep = workflow.steps.find(s => s.id === step.id);
            if (workflowStep) {
                workflowStep.status = step.status;
                workflowStep.result = step.result;
            }
        }
        // Handle completion
        if (status === 'completed') {
            this.runningWorkflows.delete(executionId);
            vscode.window.showInformationMessage(`Workflow completed: ${workflow.name}`);
            if (result) {
                this.showWorkflowResult(workflow, result);
            }
        }
        // Handle failure
        if (status === 'failed') {
            this.runningWorkflows.delete(executionId);
            vscode.window.showErrorMessage(`Workflow failed: ${workflow.name} - ${error || 'Unknown error'}`);
        }
    }
    showWorkflowProgress(workflow) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running workflow: ${workflow.name}`,
            cancellable: true
        }, async (progress, token) => {
            return new Promise((resolve, reject) => {
                // Setup cancellation
                token.onCancellationRequested(() => {
                    this.stopWorkflow(workflow.id);
                    reject(new Error('Workflow cancelled by user'));
                });
                // Monitor workflow progress
                const checkProgress = () => {
                    const currentWorkflow = this.runningWorkflows.get(workflow.id);
                    if (!currentWorkflow) {
                        resolve();
                        return;
                    }
                    if (currentWorkflow.status === 'completed') {
                        progress.report({ increment: 100 });
                        resolve();
                        return;
                    }
                    if (currentWorkflow.status === 'failed') {
                        reject(new Error('Workflow failed'));
                        return;
                    }
                    // Calculate progress based on completed steps
                    const completedSteps = currentWorkflow.steps.filter(s => s.status === 'completed').length;
                    const totalSteps = currentWorkflow.steps.length;
                    const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
                    progress.report({
                        increment: progressPercent,
                        message: `${completedSteps}/${totalSteps} steps completed`
                    });
                    setTimeout(checkProgress, 1000);
                };
                checkProgress();
            });
        });
    }
    showWorkflowResult(workflow, result) {
        const panel = vscode.window.createWebviewPanel('workflowResult', `Workflow Result: ${workflow.name}`, vscode.ViewColumn.Beside, {
            enableScripts: true
        });
        panel.webview.html = this.getWorkflowResultWebviewContent(workflow, result);
    }
    getWorkflowResultWebviewContent(workflow, result) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Workflow Result</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .workflow-header {
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .step {
                        margin: 15px 0;
                        padding: 10px;
                        border-left: 3px solid var(--vscode-activityBarBadge-background);
                        background: var(--vscode-textBlockQuote-background);
                        border-radius: 3px;
                    }
                    .step-completed { border-left-color: #89d185; }
                    .step-failed { border-left-color: #f14c4c; }
                    .result-content {
                        background: var(--vscode-editor-background);
                        padding: 15px;
                        border-radius: 5px;
                        white-space: pre-wrap;
                        font-family: var(--vscode-editor-font-family);
                    }
                </style>
            </head>
            <body>
                <div class="workflow-header">
                    <h1>🔄 ${workflow.name}</h1>
                    <p>${workflow.description}</p>
                    <p><strong>Status:</strong> ${workflow.status}</p>
                </div>

                <h2>📋 Steps</h2>
                ${workflow.steps.map(step => `
                    <div class="step step-${step.status}">
                        <h3>${step.name}</h3>
                        <p><strong>Type:</strong> ${step.type}</p>
                        <p><strong>Status:</strong> ${step.status}</p>
                        ${step.result ? `<div class="result-content">${JSON.stringify(step.result, null, 2)}</div>` : ''}
                    </div>
                `).join('')}

                ${result ? `
                    <h2>📊 Final Result</h2>
                    <div class="result-content">${JSON.stringify(result, null, 2)}</div>
                ` : ''}
            </body>
            </html>
        `;
    }
}
exports.WorkflowManager = WorkflowManager;
//# sourceMappingURL=workflow-manager.js.map
