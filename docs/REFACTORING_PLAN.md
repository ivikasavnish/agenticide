# Agenticide Refactoring Plan - Stub-First Modular Architecture

## 🎯 Goal
Refactor Agenticide into clean, modular components using our own stub-first methodology.

## 📊 Current State

**Problem:**
- `index.js`: 2,000+ lines (monolithic)
- All commands in one file
- Hard to maintain, test, extend
- Not practicing what we preach!

## 🏗️ Target Architecture

```
agenticide-cli/
├── commands/
│   ├── chat/
│   │   ├── chatCommand.js          # Main chat loop
│   │   ├── messageHandler.js       # Process messages
│   │   └── outputFormatter.js      # Format responses
│   ├── stub/
│   │   ├── stubCommand.js          # /stub command
│   │   ├── stubOrchestrator.js     # Coordinate: AI→Git→Tasks→Display
│   │   └── stubValidator.js        # Validate stubs
│   ├── workflow/
│   │   ├── workflowCommand.js      # Workflow commands
│   │   ├── workflowRunner.js       # Execute workflows
│   │   └── workflowExporter.js     # Export to Make/Task
│   ├── plan/
│   │   ├── planCommand.js          # Interactive plan
│   │   ├── planEditor.js           # Edit plan.md
│   │   └── planTracker.js          # Track progress
│   └── index.js                    # Command registry
├── core/
│   ├── agentManager.js             # AI agent coordination
│   ├── contextBuilder.js           # Build context for AI
│   ├── outputController.js         # Control output (quiet/verbose)
│   └── sessionManager.js           # Session state
├── integrations/
│   ├── gitIntegration.js           # (existing)
│   ├── taskTracker.js              # (existing)
│   ├── codeDisplay.js              # (existing)
│   └── workflow.js                 # (existing)
├── generators/
│   ├── stubGenerator.js            # (existing - enhance)
│   ├── codeGenerator.js            # NEW - stub-based code gen
│   └── templateEngine.js           # Template rendering
└── utils/
    ├── fileUtils.js                # File operations
    ├── logger.js                   # Logging
    └── config.js                   # Configuration
```

## 📋 Implementation Plan (Stub-First!)

### Phase 1: Create Stubs for New Modules ✨

**Step 1: Generate command stubs**
```bash
# Use our own tool!
/stub chatCommand typescript service --style=airbnb
/stub stubOrchestrator typescript service --style=airbnb
/stub planEditor typescript service --style=airbnb
/stub outputController typescript service --style=airbnb
```

**Step 2: Define interfaces**
```typescript
// chatCommand.js - STUB
export interface ChatCommand {
    execute(options: ChatOptions): Promise<void>;
    handleMessage(message: string): Promise<string>;
    dispose(): void;
}

// stubOrchestrator.js - STUB
export interface StubOrchestrator {
    generate(spec: StubSpec): Promise<StubResult>;
    // Coordinates: AI → Git → Tasks → Display
}

// planEditor.js - STUB
export interface PlanEditor {
    show(): void;
    check(taskId: number): void;
    add(task: string): void;
    save(): void;
}

// outputController.js - STUB
export interface OutputController {
    setMode(mode: 'quiet' | 'normal' | 'verbose'): void;
    log(message: string, level: LogLevel): void;
    display(code: string, options: DisplayOptions): void;
}
```

### Phase 2: Implement Module by Module 🔨

**Priority Order:**
1. ✅ `core/outputController.js` - Output control (needed everywhere)
2. ✅ `core/contextBuilder.js` - Context building
3. ✅ `commands/stub/stubOrchestrator.js` - Wire Git+Tasks+AI
4. ✅ `commands/plan/planEditor.js` - Interactive plan
5. ✅ `commands/chat/chatCommand.js` - Refactored chat
6. ✅ `commands/workflow/workflowRunner.js` - Workflow execution

### Phase 3: Migrate Existing Code 🔄

**Extract from index.js:**
- [ ] Chat loop → `commands/chat/chatCommand.js`
- [ ] /stub handler → `commands/stub/stubCommand.js`
- [ ] /plan handler → `commands/plan/planCommand.js`
- [ ] Workflow commands → `commands/workflow/workflowCommand.js`
- [ ] AI agent setup → `core/agentManager.js`
- [ ] Output formatting → `core/outputController.js`

### Phase 4: Update Code Generator 🤖

**Make codeGenerator stub-based:**

```javascript
// generators/codeGenerator.js
class CodeGenerator {
    constructor(agentManager) {
        this.agentManager = agentManager;
        this.stubGen = new StubGenerator(agentManager);
    }

    /**
     * Generate code using stub-first approach
     * 1. Create stubs
     * 2. Validate structure
     * 3. Implement incrementally
     */
    async generateModule(spec) {
        // Step 1: Generate stubs
        const stubs = await this.stubGen.generateModule(
            spec.name,
            spec.language,
            spec.type,
            spec.outputDir,
            spec.requirements,
            spec.options
        );

        // Step 2: Validate
        const validation = await this.validate(stubs);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors}`);
        }

        // Step 3: Optionally implement
        if (spec.autoImplement) {
            return await this.implement(stubs);
        }

        return stubs;
    }

    /**
     * Implement stubs incrementally
     */
    async implement(stubs) {
        const results = [];
        for (const file of stubs.files) {
            for (const stub of file.stubList) {
                const impl = await this.implementStub(file, stub);
                results.push(impl);
            }
        }
        return results;
    }
}
```

## 🎯 Success Criteria

- [x] index.js < 500 lines (currently 2000+)
- [ ] All commands modular and testable
- [ ] /stub fully integrated (Git + Tasks + AI)
- [ ] Interactive /plan command working
- [ ] Output control (--quiet/--verbose)
- [ ] Code generator is stub-first
- [ ] All tests passing
- [ ] Documentation updated

## 📝 File Creation Order

1. **Stubs First (Generate with AI):**
   ```bash
   /stub outputController typescript service
   /stub contextBuilder typescript service
   /stub stubOrchestrator typescript service
   /stub planEditor typescript service
   /stub chatCommand typescript service
   /stub codeGenerator typescript service
   ```

2. **Implement Core:**
   - `core/outputController.js` (100 lines)
   - `core/contextBuilder.js` (150 lines)
   - `core/sessionManager.js` (100 lines)

3. **Implement Commands:**
   - `commands/stub/stubOrchestrator.js` (200 lines)
   - `commands/plan/planEditor.js` (150 lines)
   - `commands/chat/chatCommand.js` (300 lines)

4. **Extract & Refactor:**
   - Extract code from index.js
   - Update imports
   - Test each module
   - Delete old code

## 🚀 Benefits

1. **Modular** - Each command is independent
2. **Testable** - Easy to unit test modules
3. **Maintainable** - Small, focused files
4. **Extensible** - Add new commands easily
5. **Practices what we preach** - Uses stub-first!
6. **Professional** - Follows best practices

## 📊 Metrics

**Before:**
- index.js: 2,000 lines
- Modules: 6 files
- Test coverage: Partial

**After:**
- index.js: <500 lines (router only)
- Modules: 20+ focused files
- Test coverage: Comprehensive
- Each module: <200 lines

---

**Status:** Ready to start - using stub-first approach!
**Next:** Generate stubs for core modules
