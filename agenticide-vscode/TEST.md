# 🧪 Testing Agenticide v0.2.0

## ✅ Fixed Issues

### Issue: Command 'agenticide.refresh' not found
**Root Cause:** Function called before defined (hoisting issue)  
**Fix:** Added try-catch block and proper initialization order

## 🔧 Quick Test Checklist

### After Installation

1. **Extension Activates**
   - [ ] No errors in Developer Console
   - [ ] Welcome message appears
   - [ ] Status bar shows "All Extensions"

2. **Sidebar Panel**
   - [ ] Agenticide icon appears in activity bar
   - [ ] Click opens 3 panels: Chat, Tasks, Context
   - [ ] No errors

3. **AI Chat**
   - [ ] Press `Cmd+Shift+A`
   - [ ] Chat panel opens
   - [ ] Can type messages
   - [ ] Suggestion buttons work

4. **Tasks**
   - [ ] Click `+` button
   - [ ] Add task dialog appears
   - [ ] Task appears in list
   - [ ] Checkbox appears
   - [ ] Click checkbox toggles state

5. **Context Panel**
   - [ ] Shows project name
   - [ ] Shows extension count
   - [ ] Shows file count (after init)
   - [ ] No errors

6. **Focus Mode (Status Bar)**
   - [ ] Status bar item visible (bottom-right)
   - [ ] Click shows confirmation
   - [ ] "Enable Focus Mode" works
   - [ ] After reload, shows orange "Focus Mode"
   - [ ] Click again to restore
   - [ ] Extensions come back

7. **Commands Work**
   - [ ] `Cmd+Shift+P` → "Agenticide: Initialize Project"
   - [ ] `Cmd+Shift+P` → "Agenticide: Add Task"
   - [ ] `Cmd+Shift+P` → "Agenticide: Refresh"
   - [ ] `Cmd+Shift+P` → "Agenticide: Focus Mode"
   - [ ] `Cmd+Shift+P` → "Agenticide: Toggle Focus Mode"

8. **Code Actions**
   - [ ] Select code
   - [ ] Right-click
   - [ ] "Agenticide AI" submenu appears
   - [ ] "Explain Code" works
   - [ ] Other actions work

## 🐛 Debugging

### If Extension Doesn't Activate

1. Open Developer Tools: `Help` → `Toggle Developer Tools`
2. Check Console for errors
3. Look for red error messages
4. Check: `Developer: Show Running Extensions`

### If Commands Don't Work

1. Run: `Developer: Reload Window`
2. Check: Extension is enabled in Extensions panel
3. Verify: Package.json has all commands
4. Check: Commands registered in extension.ts

### If Focus Mode Fails

1. Check console for errors
2. Verify: Extensions API is available
3. Try manually: Extensions panel → Disable individual extensions
4. Clear state: Developer tools → Application → Local Storage → Clear

## 📝 Common Errors Fixed

### ❌ "command not found"
- **Cause:** Extension didn't activate
- **Fix:** Added try-catch, proper initialization

### ❌ "Cannot read property of undefined"
- **Cause:** WASM not initialized
- **Fix:** Await wasm.default() before using

### ❌ "TreeView registration failed"
- **Cause:** Provider exported incorrectly
- **Fix:** Proper class export in separate files

## 🚀 Installation for Testing

```bash
# Remove old version
code --uninstall-extension agenticide.agenticide

# Install new version
code --install-extension ~/agenticide/agenticide-vscode/agenticide-0.2.0.vsix

# Reload VSCode
code --reuse-window
```

## 📊 Verification Steps

1. **Console Check:**
   ```
   Help → Toggle Developer Tools → Console
   Should see: "🚀 Agenticide AI Assistant is now active!"
   No red errors
   ```

2. **Extensions Check:**
   ```
   Cmd+Shift+P → "Developer: Show Running Extensions"
   Find "agenticide" → Should show "Activated"
   ```

3. **Commands Check:**
   ```
   Cmd+Shift+P → Type "agenticide"
   Should see ~14 commands
   All should work
   ```

4. **Views Check:**
   ```
   Click Agenticide icon
   Should see 3 panels
   No "(Error)" labels
   ```

## ✅ Success Criteria

- [ ] Extension activates without errors
- [ ] All 3 panels visible
- [ ] All 14 commands work
- [ ] Focus Mode toggles properly
- [ ] Tasks checkboxes functional
- [ ] Chat panel opens
- [ ] No console errors

## 🎯 Ready for Use!

Once all checks pass, your extension is ready to use daily!
