# VS Code Extension Fork Plan

## Recommended: Fork TODO Tree

### Why TODO Tree?
1. ✅ MIT License (fully open)
2. ✅ Already has tree views working
3. ✅ File system watching
4. ✅ 500K+ installs (proven)
5. ✅ Active maintenance
6. ✅ Similar to our needs

### What We Keep
- Tree view infrastructure
- Configuration system
- Icon handling
- File watchers
- Command structure

### What We Change
- Data source: File scanning → CLI calls
- Views: Add Context, Conversations, Projects
- Commands: Add our commands
- Name/branding

### Quick Clone & Modify

```bash
# 1. Clone
git clone https://github.com/Gruntfuggly/todo-tree.git /tmp/todo-tree
cd /tmp/todo-tree

# 2. Copy relevant parts
cp -r src/dataProvider.ts /Users/vikasavnish/agenticide/vscode-extension/src/
cp -r resources /Users/vikasavnish/agenticide/vscode-extension/

# 3. Modify for our CLI
# Replace file scanning with:
exec('~/.agenticide/context_manager list-todos .')
```

## Alternative: Extension Samples

Microsoft's official samples:
https://github.com/microsoft/vscode-extension-samples

Most relevant:
- `tree-view-sample` - Tree view basics
- `webview-sample` - For AI suggestions panel
- `quickinput-sample` - For project picker

## Continue (AI Assistant)

https://github.com/continuedev/continue

What to copy:
- Sidebar webview structure
- AI suggestion display
- Context handling
- Status bar integration

## Implementation Steps

### Phase 1: Get TODO Tree Working (1 hour)
```bash
git clone https://github.com/Gruntfuggly/todo-tree.git
cd todo-tree
npm install
code .
# Press F5 to test
```

### Phase 2: Modify for Agenticide (2 hours)
1. Change package.json (name, commands)
2. Add agenticideClient.ts
3. Modify dataProvider to call CLI
4. Add Context, Projects views

### Phase 3: Test (1 hour)
1. Run in Extension Development Host
2. Test all commands
3. Verify CLI integration

### Phase 4: Polish (1 hour)
1. Add icons
2. Update README
3. Configure settings

## Total Time: ~5 hours

Much faster than building from scratch!

---

Want me to clone and start modifying TODO Tree now?
