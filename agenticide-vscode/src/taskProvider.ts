import * as vscode from 'vscode';
import { getTasks } from './extension';

interface Task {
    id: number;
    description: string;
    completed: boolean;
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            return [this.createInfoItem('⚠️ No workspace folder open')];
        }

        try {
            const allTasks = getTasks();
            
            if (allTasks.length === 0) {
                return [
                    this.createInfoItem('📝 No tasks yet'),
                    this.createInfoItem('Click + to add a task')
                ];
            }

            return allTasks.map(t => new TaskTreeItem(t));

        } catch (error) {
            console.error('Failed to load tasks:', error);
            return [this.createInfoItem(`❌ Error: ${error}`)];
        }
    }

    private createInfoItem(label: string): TaskTreeItem {
        return new TaskTreeItem({
            id: 0,
            description: label,
            completed: false
        }, 'info');
    }
}

export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        contextValue?: string
    ) {
        const state = vscode.TreeItemCollapsibleState.None;

        super(task.description, state);

        this.contextValue = contextValue || 'task';
        this.task = task;

        // Set checkbox and styling based on completion status
        if (contextValue === 'info') {
            this.iconPath = new vscode.ThemeIcon('info');
            this.contextValue = 'info';
        } else if (task.completed) {
            // Checked checkbox for completed tasks
            this.checkboxState = vscode.TreeItemCheckboxState.Checked;
            this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
            this.description = `✓ Done`;
            this.tooltip = `Task completed`;
            
            // Strike-through completed tasks
            this.resourceUri = vscode.Uri.parse('completed://task');
        } else {
            // Unchecked checkbox for pending tasks
            this.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
            this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('list.warningForeground'));
            this.description = `Task #${task.id}`;
            this.tooltip = `Click checkbox to complete`;
        }

        // Add command to toggle on click
        this.command = undefined; // We'll use checkbox instead
    }

    private getRelativeTime(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}

// Decoration provider for strike-through completed tasks
export class TaskDecorationProvider implements vscode.FileDecorationProvider {
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
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
