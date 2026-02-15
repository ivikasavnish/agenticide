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
exports.getTasks = getTasks;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chatView_1 = require("./chatView");
const chatEditor_1 = require("./chatEditor");
const taskProvider_1 = require("./taskProvider");
let tasks = [];
let nextTaskId = 1;
let extensionContext;
let focusModeStatusBar;
async function activate(context) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Agenticide AI ACTIVATING...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    extensionContext = context;
    // Load tasks from workspace storage
    tasks = context.workspaceState.get('agenticide.tasks', []);
    nextTaskId = context.workspaceState.get('agenticide.nextTaskId', 1);
    console.log(`✅ Loaded ${tasks.length} tasks from storage`);
    console.log('Step 1: Status bar...');
    focusModeStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    focusModeStatusBar.command = 'agenticide.toggleFocusMode';
    focusModeStatusBar.text = '$(extensions) Extensions';
    focusModeStatusBar.tooltip = 'Focus Mode: OFF';
    focusModeStatusBar.show();
    context.subscriptions.push(focusModeStatusBar);
    console.log('✅ Status bar');
    console.log('Step 2: Chat providers...');
    const chatProvider = new chatView_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('agenticide-chat', chatProvider));
    console.log('✅ Chat registered');
    console.log('Step 3: Task provider...');
    const taskProvider = new taskProvider_1.TaskTreeProvider();
    const taskTreeView = vscode.window.createTreeView('agenticide-tasks', {
        treeDataProvider: taskProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(taskTreeView);
    context.subscriptions.push(vscode.window.registerFileDecorationProvider(new taskProvider_1.TaskDecorationProvider()));
    taskTreeView.onDidChangeCheckboxState(async (e) => {
        for (const [item, state] of e.items) {
            if (item.contextValue === 'task') {
                await toggleTaskCompletion(item.task.id, state === vscode.TreeItemCheckboxState.Checked);
                taskProvider.refresh();
            }
        }
    });
    console.log('✅ Tasks registered');
    console.log('Step 4: Context provider...');
    const contextProvider = new ContextTreeProvider();
    vscode.window.registerTreeDataProvider('agenticide-context', contextProvider);
    console.log('✅ Context registered');
    console.log('Step 5: Commands...');
    registerCommands(context, taskProvider, contextProvider, chatProvider);
    console.log('✅ Commands registered');
    console.log('✅✅✅ ACTIVATED SUCCESSFULLY ✅✅✅');
    vscode.window.showInformationMessage('🤖 Agenticide ready! Press Cmd+Shift+A');
}
function registerCommands(context, taskProvider, contextProvider, chatProvider) {
    // Initialize Project
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.init', async () => {
        const ws = vscode.workspace.workspaceFolders?.[0];
        if (!ws)
            return vscode.window.showErrorMessage('No workspace');
        // Initialize with empty task list
        tasks = [];
        nextTaskId = 1;
        await saveTasks();
        vscode.window.showInformationMessage('✅ Initialized!');
        taskProvider.refresh();
        contextProvider.refresh();
    }));
    // Chat commands
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.chat', () => {
        const config = vscode.workspace.getConfiguration('agenticide');
        if (config.get('chatLocation') === 'sidebar') {
            vscode.commands.executeCommand('agenticide-chat.focus');
        }
        else {
            chatEditor_1.ChatEditorProvider.openChat(context);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.chatSidebar', () => {
        vscode.commands.executeCommand('agenticide-chat.focus');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.chatEditor', () => {
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    // Code actions
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.document.getText(editor.selection);
        if (!selection)
            return vscode.window.showWarningMessage('Select code first');
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.fixCode', async () => {
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.generateTests', async () => {
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.refactor', async () => {
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.addComments', async () => {
        chatEditor_1.ChatEditorProvider.openChat(context);
    }));
    // Task commands
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.addTask', async () => {
        const desc = await vscode.window.showInputBox({ prompt: 'Task description' });
        if (!desc)
            return;
        const newTask = {
            id: nextTaskId++,
            description: desc,
            completed: false
        };
        tasks.push(newTask);
        await saveTasks();
        vscode.window.showInformationMessage(`✅ Added: ${desc}`);
        taskProvider.refresh();
        contextProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.toggleTask', async (item) => {
        if (!item?.task)
            return;
        await toggleTaskCompletion(item.task.id, !item.task.completed);
        taskProvider.refresh();
        contextProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.deleteTask', async (item) => {
        if (!item?.task)
            return;
        const confirm = await vscode.window.showWarningMessage(`Delete "${item.task.description}"?`, 'Delete', 'Cancel');
        if (confirm === 'Delete') {
            tasks = tasks.filter(t => t.id !== item.task.id);
            await saveTasks();
            vscode.window.showInformationMessage('✅ Deleted');
            taskProvider.refresh();
            contextProvider.refresh();
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.refresh', () => {
        taskProvider.refresh();
        contextProvider.refresh();
    }));
    // Focus Mode
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.focusMode', async () => {
        const result = await vscode.window.showWarningMessage('🎯 Disable all other extensions?', { modal: true }, 'Enable Focus Mode', 'Cancel');
        if (result === 'Enable Focus Mode') {
            await enableFocusMode(context);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.restoreExtensions', async () => {
        await restoreExtensions(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agenticide.toggleFocusMode', async () => {
        const isActive = context.globalState.get('agenticide.focusModeActive', false);
        if (isActive) {
            await vscode.commands.executeCommand('agenticide.restoreExtensions');
        }
        else {
            await vscode.commands.executeCommand('agenticide.focusMode');
        }
        updateStatusBar(context);
    }));
}
async function toggleTaskCompletion(taskId, completed) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = completed;
        await saveTasks();
    }
}
async function saveTasks() {
    await extensionContext.workspaceState.update('agenticide.tasks', tasks);
    await extensionContext.workspaceState.update('agenticide.nextTaskId', nextTaskId);
}
function getTasks() {
    return tasks;
}
async function enableFocusMode(context) {
    const allExts = vscode.extensions.all;
    const disabled = [];
    for (const ext of allExts) {
        if (ext.id === 'agenticide.agenticide' || ext.id.startsWith('vscode.') || ext.id.startsWith('ms-vscode.')) {
            continue;
        }
        disabled.push(ext.id);
    }
    await context.globalState.update('agenticide.disabledExtensions', disabled);
    await context.globalState.update('agenticide.focusModeActive', true);
    const result = await vscode.window.showInformationMessage(`✅ Focus Mode: ${disabled.length} extensions will be disabled`, 'Reload Now', 'Later');
    if (result === 'Reload Now') {
        for (const id of disabled) {
            try {
                await vscode.commands.executeCommand('workbench.extensions.disableExtension', id);
            }
            catch { }
        }
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
    updateStatusBar(context);
}
async function restoreExtensions(context) {
    const disabled = context.globalState.get('agenticide.disabledExtensions');
    if (!disabled || disabled.length === 0) {
        return vscode.window.showInformationMessage('No extensions to restore');
    }
    const result = await vscode.window.showInformationMessage(`Restore ${disabled.length} extensions?`, { modal: true }, 'Restore All', 'Cancel');
    if (result === 'Restore All') {
        for (const id of disabled) {
            try {
                await vscode.commands.executeCommand('workbench.extensions.enableExtension', id);
            }
            catch { }
        }
        await context.globalState.update('agenticide.disabledExtensions', undefined);
        await context.globalState.update('agenticide.focusModeActive', false);
        const reload = await vscode.window.showInformationMessage('✅ Extensions restored!', 'Reload Now', 'Later');
        if (reload === 'Reload Now') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
    updateStatusBar(context);
}
function updateStatusBar(context) {
    const isActive = context.globalState.get('agenticide.focusModeActive', false);
    if (isActive) {
        focusModeStatusBar.text = '$(eye-closed) Focus';
        focusModeStatusBar.tooltip = 'Focus Mode: ON';
        focusModeStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    else {
        focusModeStatusBar.text = '$(extensions) Extensions';
        focusModeStatusBar.tooltip = 'Focus Mode: OFF';
        focusModeStatusBar.backgroundColor = undefined;
    }
}
class ContextTreeProvider {
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
    async getChildren() {
        if (!vscode.workspace.workspaceFolders)
            return [];
        const ws = vscode.workspace.workspaceFolders[0];
        const contextPath = path.join(ws.uri.fsPath, '.context.json');
        if (!fs.existsSync(contextPath)) {
            return [new ContextTreeItem('⚠️ Not initialized', 'info')];
        }
        try {
            const data = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
            const items = [];
            items.push(new ContextTreeItem(`📁 ${path.basename(ws.uri.fsPath)}`, 'project'));
            const allExts = vscode.extensions.all.filter(e => !e.id.startsWith('vscode.') &&
                !e.id.startsWith('ms-vscode.') &&
                e.id !== 'agenticide.agenticide');
            items.push(new ContextTreeItem(`🧩 ${allExts.length} extensions`, 'extensions'));
            if (data.files) {
                items.push(new ContextTreeItem(`📄 ${data.files.length} files`, 'files'));
            }
            if (data.todos) {
                const pending = data.todos.filter((t) => t.status === 'pending').length;
                const completed = data.todos.filter((t) => t.status === 'completed').length;
                const pct = pending + completed > 0 ? Math.round((completed / (pending + completed)) * 100) : 0;
                items.push(new ContextTreeItem(`✓ ${pct}% done (${completed}/${pending + completed})`, 'stats'));
            }
            return items;
        }
        catch {
            return [];
        }
    }
}
class ContextTreeItem extends vscode.TreeItem {
    constructor(label, contextValue) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = contextValue;
        const icons = {
            'info': 'info',
            'project': 'folder',
            'files': 'files',
            'stats': 'graph',
            'extensions': 'extensions'
        };
        this.iconPath = new vscode.ThemeIcon(icons[contextValue] || 'circle');
    }
}
function deactivate() {
    console.log('Agenticide deactivated');
}
//# sourceMappingURL=extension.js.map