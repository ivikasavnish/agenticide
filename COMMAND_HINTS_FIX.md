# Command Hints & Extension Loading Bug Fixes

## Issues Found
1. **inquirer.prompt is not a function** - Inquirer v13.2.2 is ESM-only, incompatible with CommonJS `require()`
2. **Extension 'design' not found** - ExtensionManager only loaded `.js` files, not directory-based extensions
3. **No command aliasing** - Commands like 'design' couldn't find 'lovable-design' extension

## Root Causes
1. Inquirer v13+ requires ESM imports (`import` not `require`)
2. ExtensionManager.loadExtensions() filtered for `.js` files only, ignoring directories
3. getExtension() only did direct name lookup, no command-to-extension mapping

## Solutions Implemented

### 1. Replace Inquirer with Readline (commandMatcher.js)
```javascript
// Before: ESM-only inquirer
const answer = await inquirer.prompt([{
    type: 'list',
    name: 'command',
    message: 'Select command:',
    choices
}]);

// After: Native readline
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
return new Promise((resolve) => {
    rl.question('Select number: ', (answer) => {
        rl.close();
        resolve(suggestions[parseInt(answer) - 1]?.command);
    });
});
```

### 2. Support Directory-Based Extensions (extensionManager.js)
```javascript
// Before: Only .js files
const files = fs.readdirSync(this.extensionsDir)
    .filter(f => f.endsWith('.js') && !f.startsWith('.'));

// After: Both files and directories
const items = fs.readdirSync(this.extensionsDir);
for (const item of items) {
    const stat = fs.statSync(path.join(this.extensionsDir, item));
    if (stat.isFile() && item.endsWith('.js')) {
        // Single file extension
    } else if (stat.isDirectory() && hasIndexOrManifest) {
        // Directory-based extension
    }
}
```

### 3. Add Command-to-Extension Mapping (extensionManager.js)
```javascript
// New: commandMap in constructor
this.commandMap = new Map();

// Build map when loading extension
for (const cmd of extension.commands) {
    const cmdName = typeof cmd === 'string' ? cmd : cmd.name;
    this.commandMap.set(cmdName, extensionName);
}

// Enhanced getExtension
getExtension(name) {
    let extension = this.extensions.get(name);
    if (!extension) {
        const extName = this.commandMap.get(name);
        extension = this.extensions.get(extName);
    }
    return extension;
}
```

### 4. Fix LovableDesignExtension Base Class (lovable-design/index.js)
```javascript
// Before: Plain class
class LovableDesignExtension { ... }

// After: Extends Extension
const Extension = require('../../core/extensionManager').Extension;
class LovableDesignExtension extends Extension {
    constructor() {
        super();
        this.name = 'lovable-design';
        this.commands = [
            { name: 'design', description: 'Lovable Design UI server' },
            { name: 'ui', description: 'Alias for design' },
            { name: 'preview', description: 'Alias for design' }
        ];
    }
}
```

## Files Modified
1. **agenticide-cli/core/commandMatcher.js**
   - Lines 133-172: Replaced inquirer with readline prompt
   
2. **agenticide-cli/core/extensionManager.js**
   - Line 93: Added `commandMap` to constructor
   - Lines 109-145: Enhanced loadExtensions to support directories
   - Lines 157-195: Enhanced loadExtension for directory lookup
   - Lines 186-192: Build command map when loading
   - Lines 297-310: Enhanced getExtension with command map lookup

3. **agenticide-cli/extensions/lovable-design/index.js**
   - Lines 1-41: Extended Extension base class with proper structure

4. **agenticide-cli/commands/chat/fullChatImplementation.js**
   - Line 660: Added 'design' to extension command handler
   - Line 1435: Removed inquirer parameter

## Testing
```bash
# Extension loading test
node -e "
const { ExtensionManager } = require('./agenticide-cli/core/extensionManager');
const em = new ExtensionManager();
em.loadExtensions().then(result => {
    console.log('Loaded:', result.loaded);
    console.log('Design extension:', em.getExtension('design') ? '✓' : '✗');
});
"
# Output: Loaded: 10, Design extension: ✓

# Command matcher test
node test-command-matcher.js
# Output: ✓ 24/24 tests passing (100%)

# Try in chat
agenticide chat
/design start       # ✓ Works
/ui start          # ✓ Works (alias)
/desing            # ✓ Suggests /design
```

## Benefits
✅ No ESM dependencies in CommonJS code
✅ Supports modular directory-based extensions
✅ Command aliases work seamlessly (design/ui/preview)
✅ Cleaner extension structure with proper inheritance
✅ Backward compatible with single-file extensions

## Status: ✅ ALL FIXED

All extensions load correctly:
- api, browser, cli, debugger, docker
- **lovable-design** ✨ (new, directory-based)
- mcp, process, qa, sql

Command mapping works:
- `/design` → lovable-design
- `/ui` → lovable-design
- `/preview` → lovable-design

