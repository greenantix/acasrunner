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
exports.WorkflowTreeItem = exports.ActivityTreeItem = exports.leoWorkflowTreeDataProvider = exports.leoActivityTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
class leoActivityTreeDataProvider {
    constructor(leoConnection) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.activities = [];
        this.leoConnection = leoConnection;
        this.setupEventListeners();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show recent activities
            return Promise.resolve(this.getActivityItems());
        }
        return Promise.resolve([]);
    }
    setupEventListeners() {
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
    getActivityItems() {
        return this.activities.map(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString();
            const label = `${activity.type} - ${time}`;
            const description = activity.message || '';
            return new ActivityTreeItem(label, description, vscode.TreeItemCollapsibleState.None, activity);
        });
    }
}
exports.leoActivityTreeDataProvider = leoActivityTreeDataProvider;
class leoWorkflowTreeDataProvider {
    constructor(leoConnection) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.workflows = [];
        this.leoConnection = leoConnection;
        this.loadWorkflows();
    }
    refresh() {
        this.loadWorkflows();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show available workflows
            return Promise.resolve(this.getWorkflowItems());
        }
        return Promise.resolve([]);
    }
    async loadWorkflows() {
        try {
            const response = await this.leoConnection.sendHTTP('workflows');
            this.workflows = response.workflows || [];
        }
        catch (error) {
            console.error('Failed to load workflows:', error);
            this.workflows = [];
        }
    }
    getWorkflowItems() {
        return this.workflows.map(workflow => {
            return new WorkflowTreeItem(workflow.name, workflow.description || '', vscode.TreeItemCollapsibleState.None, workflow, {
                command: 'leo.runWorkflow',
                title: 'Run Workflow',
                arguments: [workflow.id]
            });
        });
    }
}
exports.leoWorkflowTreeDataProvider = leoWorkflowTreeDataProvider;
class ActivityTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, activity) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.activity = activity;
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;
        // Set icon based on activity type
        this.iconPath = this.getActivityIcon(activity.type);
        // Set context value for context menu
        this.contextValue = 'activity';
    }
    getActivityIcon(type) {
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
exports.ActivityTreeItem = ActivityTreeItem;
class WorkflowTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, workflow, command) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.workflow = workflow;
        this.command = command;
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;
        this.command = command;
        // Set icon
        this.iconPath = new vscode.ThemeIcon('play');
        // Set context value for context menu
        this.contextValue = 'workflow';
    }
}
exports.WorkflowTreeItem = WorkflowTreeItem;
//# sourceMappingURL=tree-data-provider.js.map
