# Agenticide: Minimal WASM Extension

## 🎯 Why WASM Instead of Forking Continue?

**Continue Issues**:
- 194K objects (~500MB clone)
- Massive codebase to maintain
- Heavy dependencies (React, Redux, socket.io)
- Overkill for our needs

**WASM Benefits**:
- ✅ **Portable**: Runs in browser sandbox, no shell execution needed
- ✅ **Fast**: Near-native performance
- ✅ **Secure**: Sandboxed execution
- ✅ **Cross-platform**: Same binary works everywhere
- ✅ **Small**: Rust compiles to tiny WASM (~100KB vs 1MB binary)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│   Agenticide VS Code Extension (Minimal)    │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │  TypeScript Extension Host             │ │
│  │  - TreeView for TODOs                  │ │
│  │  - WebView for Agent Status            │ │
│  │  - Commands (init, add, complete)      │ │
│  └───────────────┬────────────────────────┘ │
│                  │                           │
│                  ↓                           │
│  ┌────────────────────────────────────────┐ │
│  │  WASM Modules (Rust compiled)          │ │
│  │  - context_manager.wasm (~100KB)       │ │
│  │  - lsp_manager.wasm (~50KB)            │ │
│  └────────────────────────────────────────┘ │
│                  │                           │
│                  ↓                           │
│         Shared TODO List (.context.json)    │
└─────────────────────────────────────────────┘
```

## 📦 Minimal Extension Structure

```
agenticide-vscode/
├── package.json          # Extension manifest
├── src/
│   ├── extension.ts      # Entry point (~100 lines)
│   ├── wasm/
│   │   ├── contextManager.ts   # WASM wrapper
│   │   └── lspManager.ts       # WASM wrapper
│   ├── views/
│   │   ├── todoTree.ts         # TreeView provider
│   │   └── agentPanel.ts       # WebView panel
│   └── commands/
│       ├── init.ts             # Initialize project
│       ├── addTodo.ts          # Add TODO
│       └── startAgent.ts       # Start agent
├── wasm/
│   ├── context_manager.wasm    # Compiled Rust
│   └── lsp_manager.wasm        # Compiled Rust
├── media/
│   └── icon.png
└── README.md
```

## 🦀 Rust to WASM Compilation

### Step 1: Add WASM Target to Rust Projects

```bash
# In context-manager/
cargo install wasm-pack
rustup target add wasm32-unknown-unknown

# Modify Cargo.toml:
[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.6"
```

### Step 2: Create WASM Exports

```rust
// context-manager/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn init_project(path: &str) -> Result<JsValue, JsValue> {
    let context = Context::new(path)?;
    Ok(serde_wasm_bindgen::to_value(&context)?)
}

#[wasm_bindgen]
pub fn add_todo(path: &str, description: &str) -> Result<JsValue, JsValue> {
    let mut context = Context::load(path)?;
    context.add_todo(description);
    context.save()?;
    Ok(JsValue::NULL)
}

#[wasm_bindgen]
pub fn list_todos(path: &str) -> Result<JsValue, JsValue> {
    let context = Context::load(path)?;
    Ok(serde_wasm_bindgen::to_value(&context.todos)?)
}
```

### Step 3: Build WASM

```bash
cd context-manager
wasm-pack build --target web --out-dir ../agenticide-vscode/wasm

# Output:
# - context_manager.wasm (~100KB)
# - context_manager.js (glue code)
# - context_manager.d.ts (TypeScript types)
```

## 📝 TypeScript Extension Code

### extension.ts (Minimal Entry Point)

```typescript
import * as vscode from 'vscode';
import { TodoTreeProvider } from './views/todoTree';
import { AgentPanelProvider } from './views/agentPanel';
import * as contextManager from '../wasm/context_manager';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize WASM modules
  await contextManager.default();
  
  // Register TreeView
  const todoProvider = new TodoTreeProvider();
  vscode.window.registerTreeDataProvider('agenticide-todos', todoProvider);
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('agenticide.init', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;
      
      await contextManager.init_project(workspaceFolder.uri.fsPath);
      vscode.window.showInformationMessage('Agenticide initialized!');
      todoProvider.refresh();
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('agenticide.addTodo', async () => {
      const description = await vscode.window.showInputBox({
        prompt: 'Enter TODO description'
      });
      if (!description) return;
      
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      await contextManager.add_todo(workspaceFolder.uri.fsPath, description);
      todoProvider.refresh();
    })
  );
}
```

### views/todoTree.ts (TreeView Provider)

```typescript
import * as vscode from 'vscode';
import * as contextManager from '../../wasm/context_manager';

export class TodoTreeProvider implements vscode.TreeDataProvider<TodoItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TodoItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TodoItem): Promise<TodoItem[]> {
    if (!vscode.workspace.workspaceFolders) return [];
    
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const todos = await contextManager.list_todos(workspaceFolder.uri.fsPath);
    
    return todos.map(todo => new TodoItem(
      todo.description,
      todo.status === 'completed' 
        ? vscode.TreeItemCollapsibleState.None 
        : vscode.TreeItemCollapsibleState.None,
      todo
    ));
  }
}

class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly todo: any
  ) {
    super(label, collapsibleState);
    
    this.iconPath = new vscode.ThemeIcon(
      todo.status === 'completed' ? 'check' : 'circle-outline'
    );
    
    this.contextValue = todo.status === 'completed' ? 'completed' : 'pending';
  }
}
```

## 📋 VS Code Extension package.json

```json
{
  "name": "agenticide",
  "displayName": "Agenticide - Multi-Agent IDE",
  "version": "0.1.0",
  "publisher": "agenticide",
  "engines": {
    "vscode": "^1.75.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "agenticide-todos",
          "name": "Agenticide TODOs"
        }
      ]
    },
    "commands": [
      {
        "command": "agenticide.init",
        "title": "Agenticide: Initialize Project"
      },
      {
        "command": "agenticide.addTodo",
        "title": "Agenticide: Add TODO"
      },
      {
        "command": "agenticide.completeTodo",
        "title": "Agenticide: Complete TODO"
      },
      {
        "command": "agenticide.startAgent",
        "title": "Agenticide: Start Agent"
      }
    ],
    "menus": {
      "view/item/context": [
        {
          "command": "agenticide.completeTodo",
          "when": "view == agenticide-todos && viewItem == pending"
        }
      ]
    }
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/vscode": "^1.75.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "@vscode/vsce": "^2.19.0"
  }
}
```

## 🚀 Build & Deploy Process

### 1. Build Rust to WASM

```bash
# Build context manager
cd context-manager
wasm-pack build --target web --out-dir ../agenticide-vscode/wasm

# Build LSP manager
cd ../lsp-manager
wasm-pack build --target web --out-dir ../agenticide-vscode/wasm
```

### 2. Build TypeScript

```bash
cd agenticide-vscode
npm install
npm run compile
```

### 3. Test Extension

```bash
# Press F5 in VS Code to launch Extension Development Host
# Or:
code --extensionDevelopmentPath=/Users/vikasavnish/agenticide/agenticide-vscode
```

### 4. Package Extension

```bash
npm install -g @vscode/vsce
vsce package
# Creates: agenticide-0.1.0.vsix
```

### 5. Publish

```bash
vsce publish
# Or manually upload .vsix to VS Code Marketplace
```

## 📊 Size Comparison

| Approach | Size | Load Time | Complexity |
|----------|------|-----------|------------|
| **Fork Continue** | ~500MB | ~5s | Very High |
| **Shell to Rust** | ~2MB | ~100ms | Medium |
| **WASM Modules** | **~200KB** | **~10ms** | **Low** |

## ✅ Advantages of WASM Approach

1. **No PATH dependencies**: WASM bundles with extension
2. **No shell execution**: More secure, works in web VS Code
3. **Instant startup**: ~10ms vs ~100ms for process spawn
4. **Cross-platform**: One build works on Windows/Mac/Linux
5. **Future-proof**: Can run in vscode.dev (browser)
6. **Smaller bundle**: 200KB vs 2MB binaries

## 🎯 Implementation Timeline

| Day | Task | Output |
|-----|------|--------|
| 1 | Add WASM support to Rust projects | Cargo.toml updated |
| 1 | Build context_manager.wasm | ~100KB WASM file |
| 1 | Build lsp_manager.wasm | ~50KB WASM file |
| 2 | Create minimal extension structure | package.json, tsconfig |
| 2 | Implement WASM wrappers | TypeScript glue code |
| 3 | Build TreeView for TODOs | Interactive tree |
| 3 | Build WebView for agent status | Real-time panel |
| 4 | Add command palette integration | Commands work |
| 4 | Test on real projects | Validate functionality |
| 5 | Polish UI, add icons | Production ready |
| 5 | Package and publish | .vsix file |

**Total: 5 days** (vs 11 days for Continue fork)

## 🔧 Next Steps

1. ✅ **Modify Rust projects** for WASM compilation
2. **Build WASM modules** with wasm-pack
3. **Create minimal extension** (~500 lines total)
4. **Test locally** with F5
5. **Package and share** .vsix file

---

**Key Innovation**: Using **WASM instead of shelling out** makes the extension:
- **Faster** (10ms vs 100ms)
- **Smaller** (200KB vs 2MB)
- **Portable** (works in browser VS Code)
- **Secure** (sandboxed execution)

This is the **modern way** to build VS Code extensions with Rust!
