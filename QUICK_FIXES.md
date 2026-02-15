# Quick Fixes for Agenticide

## Issue 1: Chat Output (Not Actually Duplicating)

**Analysis:** There are 4 boxen() outputs but they're for different commands:
- Line 664: `/debug` command  
- Line 1120: `/plan` command
- Line 1300: Default chat response
- Line 1401: `explain` command  

**Real Issue:** If user sees doubles, it's likely:
1. Input echo + response (normal)
2. Agent responding twice (need to check AI agent)

**Fix:** Add `--quiet` mode to suppress extra output.

## Issue 2: /stub Not Calling AI

**Current:** /stub command in index.js just shows help text or error
**Problem:** Not integrated with full Git + Tasks + AI flow

**Fix Required:**
```javascript
// In /stub command around line 735:
const result = await stubGen.generateModule(...);
// Should trigger:
// 1. Git branch creation
// 2. AI generation
// 3. Task creation
// 4. Git commit
// 5. Display with copy
```

## Issue 3: Plan Not Interactive

**Current:** plan.md is just a file
**Needed:** Interactive `/plan` command

**Features to Add:**
```bash
/plan              # Show current plan with checkboxes
/plan check 3      # Check off task #3
/plan add "task"   # Add new task
/plan save         # Save progress
```

## Issue 4: Output Steering

**Add flags:**
```bash
agenticide chat --quiet       # Minimal output
agenticide chat --verbose     # Full output  
agenticide chat --no-display  # No code boxes
```

## Priority Order

1. ✅ Make /stub actually work with AI
2. ✅ Wire Git + Tasks integration  
3. ✅ Add /plan interactive command
4. ✅ Add output flags
5. ✅ Test in real project

