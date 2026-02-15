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
exports.TaskDecorationProvider = exports.TaskTreeItem = exports.TaskTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const extension_1 = require("./extension");
class TaskTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!vscode.workspace.workspaceFolders) {
            return [this.createInfoItem('⚠️ No workspace folder open')];
        }
        try {
            const allTasks = (0, extension_1.getTasks)();
            if (allTasks.length === 0) {
                return [
                    this.createInfoItem('📝 No tasks yet'),
                    this.createInfoItem('Click + to add a task')
                ];
            }
            return allTasks.map(t => new TaskTreeItem(t));
        }
        catch (error) {
            console.error('Failed to load tasks:', error);
            return [this.createInfoItem(`❌ Error: ${error}`)];
        }
    }
    createInfoItem(label) {
        return new TaskTreeItem({
            id: 0,
            description: label,
            completed: false
        }, 'info');
    }
}
exports.TaskTreeProvider = TaskTreeProvider;
class TaskTreeItem extends vscode.TreeItem {
    constructor(task, contextValue) {
        const state = vscode.TreeItemCollapsibleState.None;
        super(task.description, state);
        this.task = task;
        this.contextValue = contextValue || 'task';
        this.task = task;
        // Set checkbox and styling based on completion status
        if (contextValue === 'info') {
            this.iconPath = new vscode.ThemeIcon('info');
            this.contextValue = 'info';
        }
        else if (task.completed) {
            // Checked checkbox for completed tasks
            this.checkboxState = vscode.TreeItemCheckboxState.Checked;
            this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
            this.description = `✓ Done`;
            this.tooltip = `Task completed`;
            // Strike-through completed tasks
            this.resourceUri = vscode.Uri.parse('completed://task');
        }
        else {
            // Unchecked checkbox for pending tasks
            this.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
            this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('list.warningForeground'));
            this.description = `Task #${task.id}`;
            this.tooltip = `Click checkbox to complete`;
        }
        // Add command to toggle on click
        this.command = undefined; // We'll use checkbox instead
    }
    getRelativeTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}
exports.TaskTreeItem = TaskTreeItem;
// Decoration provider for strike-through completed tasks
class TaskDecorationProvider {
    provideFileDecoration(uri) {
        if (uri.scheme === 'completed') {
            return {
                badge: '✓',
                tooltip: 'Completed',
                color: new vscode.ThemeColor('gitDecoration.ignoredResourceForeground')
            };
        }
        return undefined;
    }
}
exports.TaskDecorationProvider = TaskDecorationProvider;
//# sourceMappingURL=taskProvider.js.map