# Strategy: Fork & Extend Existing VS Code Extensions

## Best Approach: Combine Proven Extensions

Instead of building from scratch, we should fork and combine these open-source extensions:

### 1. **TODO Tree** (MIT License)
**Repository**: https://github.com/Gruntfuggly/todo-tree
**Use for**: TODO management, tree view structure, file watching

**What to take**:
- Tree view provider implementation
- TODO parsing and display
- Icons and theming
- File system watcher

### 2. **Project Manager** (MIT License)
**Repository**: https://github.com/alefragnani/vscode-project-manager
**Use for**: Project registry, switching, status bar

**What to take**:
- Project storage (.json registry)
- Quick pick for switching
- Status bar integration
- Project detection

### 3. **Remote Development Pack** (Microsoft)
**Repository**: https://github.com/microsoft/vscode-remote-release
**Use for**: Client-server architecture patterns

**What to take**:
- How to communicate with external processes
- Terminal integration
- Status notifications

### 4. **Continue** (Apache 2.0) - AI Coding Assistant
**Repository**: https://github.com/continuedev/continue
**Use for**: AI integration patterns, sidebar panels

**What to take**:
- Sidebar webview structure
- AI suggestion display
- Context gathering patterns
- Command palette integration

## Implementation Plan

### Phase 1: Fork TODO Tree (Base)
```bash
git clone https://github.com/Gruntfuggly/todo-tree.git agenticide-vscode
cd agenticide-vscode

# Keep:
- Tree view structure
- File watching
- Icon system
- Configuration system

# Replace:
- TODO detection → Call context_manager
- Data source → .context.json
- Add new views (Context, Conversations, Projects)
```

### Phase 2: Integrate Project Manager Features
```bash
# Copy from vscode-project-manager:
- src/storage/projectStorage.ts → Use for projects.json
- src/projectProvider.ts → Adapt for our registry
- Status bar item for current project
```

### Phase 3: Add AI Features (from Continue)
```bash
# Copy from continue:
- Sidebar webview for suggestions
- Context panel structure
- Command handling patterns
```

### Phase 4: Add Our CLI Integration
```bash
# New files:
- src/agenticideClient.ts → Wrapper for CLI tools
- src/commands/ → Our specific commands
- Update all providers to call CLI instead of parsing files
```

## Recommended Base: TODO Tree

**Why?**
1. ✅ Already has tree views
2. ✅ Already watches files
3. ✅ Good configuration system
4. ✅ MIT license (fully compatible)
5. ✅ Well-maintained
6. ✅ Similar domain (tracking items)

## Quick Start Guide

### Step 1: Clone TODO Tree
```bash
cd /Users/vikasavnish/agenticide
git clone https://github.com/Gruntfuggly/todo-tree.git vscode-extension-base
cd vscode-extension-base
npm install
```

### Step 2: Modify package.json
```json
{
  "name": "agenticide",
  "displayName": "Agenticide",
  "publisher": "agenticide",
  // Keep views structure
  "contributes": {
    "views": {
      "agenticide": [
        {"id": "agenticideContext", "name": "Context"},
        {"id": "agenticideTodos", "name": "TODOs"},
        {"id": "agenticideConversations", "name": "Conversations"},
        {"id": "agenticideProjects", "name": "Projects"}
      ]
    }
  }
}
```

### Step 3: Modify Tree Providers
Replace TODO Tree's file scanning with our CLI calls:

```typescript
// Before (TODO Tree):
async getTodos() {
  // Scan files for TODO comments
}

// After (Agenticide):
async getTodos() {
  const { exec } = require('child_process');
  const result = await exec('~/.agenticide/context_manager list-todos .');
  return JSON.parse(result);
}
```

### Step 4: Add New Views
Copy the tree provider pattern for:
- Context view
- Conversations view
- Projects view

## Alternative: VSCode Extension Samples

**Repository**: https://github.com/microsoft/vscode-extension-samples

Clone specific samples:
```bash
# Tree View Sample
git clone https://github.com/microsoft/vscode-extension-samples.git
cd vscode-extension-samples/tree-view-sample

# Webview Sample (for AI suggestions)
cd ../webview-sample

# Quick Pick Sample (for project switching)
cd ../quickinput-sample
```

## Recommended Approach

### Option A: Fork TODO Tree (Fastest)
**Time**: 2-3 days
**Effort**: Low
**Result**: Working extension with proven patterns

```bash
# 1. Clone
git clone https://github.com/Gruntfuggly/todo-tree.git agenticide-vscode

# 2. Rename and modify
# - Change name in package.json
# - Keep tree view structure
# - Replace data sources with CLI calls
# - Add Context, Conversations, Projects views

# 3. Test and publish
```

### Option B: Combine Multiple Extensions (Best Quality)
**Time**: 1 week
**Effort**: Medium
**Result**: Best-in-class features from multiple sources

```bash
# 1. Start with TODO Tree structure
# 2. Copy Project Manager's project switching
# 3. Copy Continue's AI suggestion panels
# 4. Add our CLI integration
```

### Option C: Use Extension Samples (Learning)
**Time**: 1 week
**Effort**: High
**Result**: Custom-built, full understanding

## File Structure (Forked TODO Tree)

```
agenticide-vscode/
├── package.json                 # Modified from TODO Tree
├── src/
│   ├── extension.ts            # Keep structure, add commands
│   ├── agenticideClient.ts     # NEW - CLI wrapper
│   ├── dataProvider.ts         # Modified from TODO Tree
│   ├── providers/
│   │   ├── todoProvider.ts     # Modified - call CLI
│   │   ├── contextProvider.ts  # NEW - show context
│   │   ├── conversationProvider.ts # NEW
│   │   └── projectProvider.ts  # NEW - from Project Manager
│   └── commands/               # Modified - our commands
├── resources/                   # Keep icons from TODO Tree
└── README.md
```

## Key Code Changes

### 1. Replace TODO Detection
```typescript
// todo-tree/src/dataProvider.ts
class DataProvider {
  // OLD:
  async findTodos() {
    // Scan files for TODO comments
  }

  // NEW:
  async findTodos() {
    const result = await exec('~/.agenticide/context_manager list-todos .');
    const context = JSON.parse(result);
    return context.todos;
  }
}
```

### 2. Add CLI Client
```typescript
// NEW FILE: src/agenticideClient.ts
export class AgenticideClient {
  async listTodos() {
    return exec('~/.agenticide/context_manager list-todos .');
  }
  
  async showContext() {
    return exec('~/.agenticide/context_manager show .');
  }
  
  async getSuggestions() {
    return exec('~/.agenticide/context_manager suggest .');
  }
}
```

## License Considerations

All recommended extensions are MIT or Apache 2.0:
- ✅ TODO Tree: MIT
- ✅ Project Manager: MIT  
- ✅ Continue: Apache 2.0
- ✅ VS Code Samples: MIT

**Our extension**: MIT (compatible with all)

## Next Steps

Which approach do you prefer?

1. **Quick (Recommended)**: Fork TODO Tree, modify for our needs
2. **Best**: Combine TODO Tree + Project Manager + Continue patterns
3. **Custom**: Build from VS Code extension samples

I can execute any of these. Which should I start with?

## Commands to Execute Now

```bash
# Option 1: Fork TODO Tree
cd /Users/vikasavnish/agenticide
git clone https://github.com/Gruntfuggly/todo-tree.git vscode-extension-fork
cd vscode-extension-fork
npm install
# Then modify package.json and providers

# Option 2: Clone Extension Samples
git clone https://github.com/microsoft/vscode-extension-samples.git
cd vscode-extension-samples/tree-view-sample
npm install

# Option 3: Clone Continue (AI assistant)
git clone https://github.com/continuedev/continue.git
cd continue/extensions/vscode
npm install
```

Want me to start with Option 1 (fork TODO Tree)?
