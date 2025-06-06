import * as vscode from 'vscode';
import { leoConnection } from '../communication/leo-connection';

export class leoActivityTreeDataProvider implements vscode.TreeDataProvider<ActivityTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ActivityTreeItem | undefined | null | void> = new vscode.EventEmitter<ActivityTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ActivityTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private activities: any[] = [];
    private leoConnection: leoConnection;

    constructor(leoConnection: leoConnection) {
        this.leoConnection = leoConnection;
        this.setupEventListeners();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ActivityTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ActivityTreeItem): Thenable<ActivityTreeItem[]> {
        if (!element) {
            // Root level - show recent activities
            return Promise.resolve(this.getActivityItems());
        }

        return Promise.resolve([]);
    }

    private setupEventListeners(): void {
        this.leoConnection.onMessage(event => {
            if (event.type === 'activity') {
                this.activities.unshift(event.data);
                
                // Keep only last 20 activities
                if (this.activities.length > 20) {
                    this.activities = this.activities.slice(0, 20);
                }
                
                this.refresh();
            }
        });
    }

    private getActivityItems(): ActivityTreeItem[] {
        return this.activities.map(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString();
            const label = `${activity.type} - ${time}`;
            const description = activity.message || '';
            
            return new ActivityTreeItem(
                label,
                description,
                vscode.TreeItemCollapsibleState.None,
                activity
            );
        });
    }
}

export class leoWorkflowTreeDataProvider implements vscode.TreeDataProvider<WorkflowTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WorkflowTreeItem | undefined | null | void> = new vscode.EventEmitter<WorkflowTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WorkflowTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private workflows: any[] = [];
    private leoConnection: leoConnection;

    constructor(leoConnection: leoConnection) {
        this.leoConnection = leoConnection;
        this.loadWorkflows();
    }

    refresh(): void {
        this.loadWorkflows();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: WorkflowTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WorkflowTreeItem): Thenable<WorkflowTreeItem[]> {
        if (!element) {
            // Root level - show available workflows
            return Promise.resolve(this.getWorkflowItems());
        }

        return Promise.resolve([]);
    }

    private async loadWorkflows(): Promise<void> {
        try {
            const response = await this.leoConnection.sendHTTP('workflows');
            this.workflows = response.workflows || [];
        } catch (error) {
            console.error('Failed to load workflows:', error);
            this.workflows = [];
        }
    }

    private getWorkflowItems(): WorkflowTreeItem[] {
        return this.workflows.map(workflow => {
            return new WorkflowTreeItem(
                workflow.name,
                workflow.description || '',
                vscode.TreeItemCollapsibleState.None,
                workflow,
                {
                    command: 'leo.runWorkflow',
                    title: 'Run Workflow',
                    arguments: [workflow.id]
                }
            );
        });
    }
}

export class ActivityTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly activity: any
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;
        
        // Set icon based on activity type
        this.iconPath = this.getActivityIcon(activity.type);
        
        // Set context value for context menu
        this.contextValue = 'activity';
    }

    private getActivityIcon(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'file_change':
                return new vscode.ThemeIcon('file');
            case 'user_action':
                return new vscode.ThemeIcon('person');
            case 'error':
                return new vscode.ThemeIcon('error');
            case 'system_event':
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('circle-filled');
        }
    }
}

export class WorkflowTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly workflow: any,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;
        this.command = command;
        
        // Set icon
        this.iconPath = new vscode.ThemeIcon('play');
        
        // Set context value for context menu
        this.contextValue = 'workflow';
    }
}
