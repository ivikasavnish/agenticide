# 🎯 Focus Mode - One-Click Extension Management

## What is Focus Mode?

Focus Mode is Agenticide's **killer feature** that lets you disable all other extensions with a single click - perfect for:

- 🚀 **Clean Testing** - Test without extension conflicts
- ⚡ **Performance** - Disable heavy extensions temporarily  
- 🔍 **Debugging** - Isolate Agenticide behavior
- 🧘 **Distraction-Free** - Just you and AI coding
- 🔄 **Easy Restore** - Re-enable everything with one click

---

## Quick Access

### Status Bar (Easiest!)
Look at the **bottom-right of VSCode**:

```
┌────────────────────────────────────┐
│ Bottom Status Bar                  │
│                                    │
│ [🔔] [Git] [Errors] [$(extensions) All Extensions] ← Click here!
└────────────────────────────────────┘
```

**Click the status bar item to toggle:**
- `$(extensions) All Extensions` → Focus Mode OFF
- `$(eye-closed) Focus Mode` → Focus Mode ON (orange background)

### Command Palette
Press `Cmd+Shift+P` and type:
- `Agenticide: Toggle Focus Mode` - Quick toggle
- `Agenticide: Focus Mode` - Enable only
- `Agenticide: Restore Extensions` - Disable only

### Context Panel Button
Click Agenticide icon → **Context** panel → Click `$(eye-closed)` button

---

## How It Works

### Enabling Focus Mode

1. **Click Status Bar** or run command
2. Confirm: "Enable Focus Mode"
3. Agenticide shows progress: "Disabling extensions..."
4. Choose: "Reload Now" or "Later"
5. After reload: **Only Agenticide is active!**

### What Gets Disabled?
- ✅ All third-party extensions
- ❌ Built-in VSCode extensions (kept active)
- ❌ Agenticide itself (obviously stays on)

### What Gets Saved?
Agenticide remembers which extensions were disabled so it can restore them later.

### Restoring Extensions

1. **Click Status Bar** (shows "Focus Mode" with orange highlight)
2. Or run: "Agenticide: Restore Extensions"
3. Confirm: "Restore All"
4. Agenticide re-enables all previously disabled extensions
5. Reload window to activate them

---

## Visual Indicators

### Status Bar States

**Focus Mode OFF:**
```
$(extensions) All Extensions
```
- Normal color
- Tooltip: "Focus Mode: OFF - Click to disable other extensions"

**Focus Mode ON:**
```
$(eye-closed) Focus Mode
```
- **Orange background** (warning color)
- Tooltip: "Focus Mode: ON - Click to restore extensions"

### Context Panel

When Focus Mode is active, Context panel shows:
```
┌────────────────────────────┐
│ 📊 CONTEXT       $(eye-closed) │
├────────────────────────────┤
│ 🎯 Focus Mode: ON          │
│ 📁 my-project              │
│ 🧩 0 other extensions      │
│ ...                        │
└────────────────────────────┘
```

When inactive:
```
┌────────────────────────────┐
│ 📊 CONTEXT       $(eye-closed) │
├────────────────────────────┤
│ 📁 my-project              │
│ 🧩 42 other extensions     │
│ ...                        │
└────────────────────────────┘
```

---

## Use Cases

### 1. Clean Testing Environment
```bash
# Before releasing your extension
1. Enable Focus Mode
2. Test all features
3. Verify no conflicts
4. Restore extensions
```

### 2. Performance Optimization
```bash
# When VSCode feels slow
1. Enable Focus Mode
2. Work with just Agenticide
3. Massive performance boost!
4. Restore when done
```

### 3. Debugging Issues
```bash
# When something breaks
1. Enable Focus Mode
2. Check if issue persists
3. If fixed → another extension was the problem
4. If not → issue is in your code
```

### 4. Focused Coding Sessions
```bash
# Deep work mode
1. Enable Focus Mode
2. Just you, code, and AI
3. No distractions from other extensions
4. Restore after session
```

---

## Technical Details

### Extension Scope
**Disabled:**
- All extensions installed by user
- Third-party marketplace extensions
- Local/dev extensions

**Not Disabled (Safe List):**
- `vscode.*` - Built-in VSCode extensions
- `ms-vscode.*` - Microsoft core extensions
- `agenticide.agenticide` - This extension!

### Storage
Focus Mode state is stored in VSCode's **global state**:
- `agenticide.focusModeActive` - Boolean flag
- `agenticide.disabledExtensions` - Array of extension IDs

This persists across:
- ✅ Window reloads
- ✅ VSCode restarts
- ✅ Workspace switches

### API Used
```typescript
// Disable extension
vscode.commands.executeCommand('workbench.extensions.disableExtension', extId)

// Enable extension  
vscode.commands.executeCommand('workbench.extensions.enableExtension', extId)

// Reload window
vscode.commands.executeCommand('workbench.action.reloadWindow')
```

---

## Keyboard Shortcuts

You can add custom shortcuts in VSCode:

1. `Cmd+K Cmd+S` → Keyboard Shortcuts
2. Search "Agenticide: Toggle Focus Mode"
3. Assign shortcut (e.g., `Cmd+Shift+F`)

**Suggested shortcuts:**
- `Cmd+Shift+F` - Toggle Focus Mode
- `Cmd+Shift+R` - Restore Extensions

---

## Comparison with Native VSCode

| Feature | Agenticide Focus Mode | VSCode Native |
|---------|----------------------|---------------|
| One-click disable all | ✅ | ❌ |
| One-click restore all | ✅ | ❌ |
| Status bar toggle | ✅ | ❌ |
| Remembers disabled | ✅ | ❌ |
| Safe list (keeps built-ins) | ✅ | ❌ |
| Progress indicator | ✅ | ❌ |

**Native VSCode requires:**
- Extensions panel → Right-click each → Disable
- Manual tracking of which to restore
- 10+ clicks for many extensions

**Agenticide Focus Mode:**
- 1 click to disable all
- 1 click to restore all
- Automatic tracking

---

## FAQ

**Q: Will I lose my extension settings?**  
A: No! Settings are preserved. Only activation state changes.

**Q: Can I selectively keep some extensions?**  
A: Not yet, but coming in v0.3.0. For now, re-enable specific ones after Focus Mode.

**Q: What if I close VSCode in Focus Mode?**  
A: State is saved! Next time you open VSCode, status bar shows "Focus Mode: ON" and you can restore.

**Q: Does it work with extension profiles?**  
A: Yes! Focus Mode works with any profile.

**Q: Can I use it on multiple workspaces?**  
A: Yes! State is global, so Focus Mode applies across all windows.

**Q: What about disabled extensions becoming outdated?**  
A: They can still update! Disabled extensions receive updates normally.

---

## Troubleshooting

**Status bar not showing?**
- Make sure extension is activated
- Check bottom-right corner
- Try reloading window

**Focus Mode button grayed out?**
- No other extensions to disable
- You're already in Focus Mode
- Check Context panel for status

**Extensions not restoring?**
- Try manual restore: Extensions panel → Enable
- Check: `Cmd+Shift+P` → "Developer: Show Running Extensions"
- Worst case: Reinstall extension from marketplace

**Reload required but not happening?**
- Click "Reload Now" when prompted
- Or manually: `Cmd+Shift+P` → "Reload Window"

---

## Pro Tips

1. **Use before demos** - Clean VSCode, no conflicts
2. **Combine with Zen Mode** - Ultimate focus: `Cmd+K Z` + Focus Mode
3. **Quick performance test** - See speed difference with/without extensions
4. **Extension conflict finder** - Enable one-by-one to find conflicts
5. **Battery saver** - Disable heavy extensions when on battery

---

## Roadmap

**Coming Soon:**
- [ ] Whitelist specific extensions to keep enabled
- [ ] Multiple focus mode profiles
- [ ] Scheduled focus mode (auto-enable at certain times)
- [ ] Integration with VSCode's extension profiles
- [ ] CLI command: `code --focus-mode`

---

## Integration Example

If you're building your own extension, here's how to add Focus Mode:

```typescript
import * as vscode from 'vscode';

async function enableFocusMode(context: vscode.ExtensionContext) {
    const allExtensions = vscode.extensions.all;
    const disabledExtensions: string[] = [];
    
    for (const ext of allExtensions) {
        // Skip your extension and built-ins
        if (ext.id === 'your.extension' || 
            ext.id.startsWith('vscode.')) {
            continue;
        }
        
        disabledExtensions.push(ext.id);
        await vscode.commands.executeCommand(
            'workbench.extensions.disableExtension', 
            ext.id
        );
    }
    
    // Save state
    await context.globalState.update('disabledExtensions', disabledExtensions);
    
    // Reload
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
}
```

---

## Summary

Focus Mode is Agenticide's **secret weapon** for a clean, distraction-free coding experience:

✅ **1 click** to disable everything  
✅ **1 click** to restore  
✅ **Status bar** indicator  
✅ **Automatic** tracking  
✅ **Safe** built-in preservation  

**Try it now:** Click the status bar item in the bottom-right! 🚀

---

**See also:**
- [README.md](./README.md) - Main documentation
- [FEATURES.md](./FEATURES.md) - All features
- [QUICK_START.md](./QUICK_START.md) - Getting started
