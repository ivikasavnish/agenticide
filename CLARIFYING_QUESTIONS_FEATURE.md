# Clarifying Questions & Dynamic Planning - Feature Documentation

## Overview

Added comprehensive support for asking clarifying questions and dynamically managing plans during interactive chat sessions. This helps gather requirements, resolve ambiguities, and create better execution plans.

## New Features

### 1. Clarifying Questions System

**Module**: `agenticide-cli/core/clarifyingQuestions.js` (230 lines)

Interactive question-asking system that helps collect structured information from users.

#### Key Methods

- `ask(question, choices, allowFreeform)` - Ask a single question
- `askMultiple(questions)` - Ask multiple questions in sequence
- `confirm(message, details)` - Get yes/no confirmation
- `choose(message, options)` - Single selection from options
- `selectMultiple(message, options)` - Multiple selection
- `input(message, validate)` - Free-form text input with validation
- `getSummary()` - Get formatted summary of all clarifications
- `save(filepath)` / `load(filepath)` - Persist clarifications

#### Example Usage

```javascript
const clarifier = new ClarifyingQuestions();

// Ask a single question with choices
const timeline = await clarifier.ask(
    'What is the expected timeline?',
    ['Hours', 'Days', 'Weeks', 'Months']
);

// Ask multiple questions
const answers = await clarifier.askMultiple([
    { question: 'What is the main goal?', key: 'goal' },
    { question: 'What are constraints?', key: 'constraints' },
    { question: 'What is the priority?', key: 'priority', choices: ['High', 'Medium', 'Low'] }
]);

// Confirm before proceeding
const confirmed = await clarifier.confirm(
    'Proceed with this approach?',
    'This will generate 15 files'
);

// Get summary for AI context
const summary = clarifier.getSummary();
// Output:
// Clarifications collected:
// - What is the main goal?
//   → Build a REST API
// - What are constraints?
//   → Must use Node.js
```

### 2. Enhanced Plan Editor

**Module**: `agenticide-cli/commands/plan/planEditor.js` (Enhanced)

Dynamic plan management with clarification tracking and versioning.

#### New Methods

- `create(goal, tasks, clarifications)` - Create plan with clarifications
- `update(newPlan)` - Update entire plan content
- `addClarification(question, answer)` - Add clarification to metadata
- `edit()` - Interactive plan editing
- `show()` - View plan with clarifications

#### Plan Metadata

Plans now include metadata stored in `plan.meta.json`:

```json
{
  "created": "2024-02-17T14:00:00.000Z",
  "updated": "2024-02-17T14:30:00.000Z",
  "version": 2,
  "clarifications": [
    {
      "question": "What is the timeline?",
      "answer": "2 weeks",
      "timestamp": "2024-02-17T14:00:00.000Z"
    }
  ]
}
```

## Chat Commands

### `/plan` Command

Comprehensive plan management in interactive chat.

#### Subcommands

```bash
/plan                  # Show current plan
/plan show             # Show current plan with clarifications
/plan create <goal>    # Create new plan (asks clarifying questions)
/plan edit             # Edit plan interactively
/plan update           # Update plan content
```

#### Usage Examples

**Create a new plan:**
```bash
You: /plan create Build REST API for blog

❓ I need some clarifications to proceed:
   3 questions to answer

[1/3]
❓ Clarification Needed:
What is the expected timeline?
Please select:
  > Hours
    Days
    Weeks
    Months

[2/3]
❓ Clarification Needed:
What is the priority?
Please select:
  > High
    Medium
    Low

[3/3]
❓ Clarification Needed:
Are there any dependencies or blockers?
Your answer: Need to set up database first

Enter initial tasks (comma-separated): 
Setup database, Create models, Build endpoints, Add authentication

✅ Plan created successfully!

📋 Current Plan:

# Plan: Build REST API for blog

**Goal**: Build REST API for blog
**Status**: In Progress

## Clarifications

- **timeline**: Days
- **priority**: High
- **blockers**: Need to set up database first

## Tasks

- [ ] Setup database
- [ ] Create models
- [ ] Build endpoints
- [ ] Add authentication

📝 Clarifications:
  1. What is the expected timeline?
     → Days
  2. What is the priority?
     → High
```

**View current plan:**
```bash
You: /plan show

📋 Current Plan:

# Plan: Build REST API for blog
[... plan content ...]

📝 Clarifications:
  1. What is the expected timeline?
     → Days
```

**Edit plan interactively:**
```bash
You: /plan edit

? What would you like to do?
  > View current plan
    Add a task
    Update entire plan
    Mark task complete
    View clarifications
    Cancel
```

### `/clarify` Command

Ask clarifying questions during any task.

```bash
You: /clarify

❓ Clarifying Questions Mode

I can help clarify requirements before proceeding.

? What would you like to clarify?
  > Requirements for current task
    Feature scope and boundaries
    Technical approach
    Dependencies and constraints
    Custom question
```

#### Predefined Question Sets

**Requirements for current task:**
- What is the main goal?
- What are the acceptance criteria?
- Are there any constraints?

**Feature scope and boundaries:**
- What is included in this feature?
- What is explicitly excluded?
- What are the edge cases to handle?

**Technical approach:**
- Which technology stack to use?
- What design patterns to apply?
- Are there performance requirements?

**Dependencies and constraints:**
- What are the dependencies?
- What are the constraints?
- What are the risks?

#### Custom Questions

```bash
You: /clarify

? What would you like to clarify?
  > Custom question

Enter your question: Should we support real-time updates?

Your answer: Yes, use WebSockets

✅ Clarification saved: Should we support real-time updates? → Yes, use WebSockets
```

## Integration with Chat Workflow

Clarifications automatically integrate with planning:

```bash
You: I need to build a user authentication system

🤖 Bot: Let me clarify a few things before we proceed.

[Automatically asks clarifying questions]

❓ What authentication method should we use?
  > JWT tokens
    Session-based
    OAuth 2.0

You: JWT tokens

❓ Should we support multi-factor authentication?
  > Yes
    No

You: Yes

✅ All questions answered

🤖 Bot: Based on your answers:
- Authentication: JWT tokens
- MFA: Yes

Creating implementation plan...

📋 Plan Created:
[... generated plan with clarifications ...]
```

## API Reference

### ClarifyingQuestions Class

```javascript
const ClarifyingQuestions = require('./core/clarifyingQuestions');
const clarifier = new ClarifyingQuestions();

// Ask questions
const answer = await clarifier.ask(question, choices, allowFreeform);
const answers = await clarifier.askMultiple(questions);
const confirmed = await clarifier.confirm(message, details);
const choice = await clarifier.choose(message, options);
const selections = await clarifier.selectMultiple(message, options);
const text = await clarifier.input(message, validate);

// Manage clarifications
const summary = clarifier.getSummary();
const all = clarifier.getAll();
clarifier.clear();
clarifier.save(filepath);
clarifier.load(filepath);
```

### PlanEditor Class

```javascript
const PlanEditor = require('./commands/plan/planEditor');
const editor = new PlanEditor(planPath);

// View and create
editor.show();
editor.create(goal, tasks, clarifications);

// Modify
editor.add(task);
editor.check(taskId);
editor.update(newPlan);
editor.addClarification(question, answer);
await editor.edit();

// Save
editor.save();
```

## Benefits

1. **Reduced Ambiguity**: Gather all requirements upfront
2. **Better Planning**: Plans include context from clarifications
3. **Traceability**: All decisions recorded with timestamps
4. **Iterative Refinement**: Update plans as requirements change
5. **AI Context**: Clarifications provide rich context for AI assistance
6. **Structured Data**: Clarifications stored in machine-readable format

## File Structure

```
agenticide-cli/
├── core/
│   └── clarifyingQuestions.js       # Question-asking system
├── commands/
│   ├── chat/
│   │   └── fullChatImplementation.js # Integrated commands
│   └── plan/
│       └── planEditor.js             # Enhanced plan editor
~/.copilot/session-state/
└── <session-id>/
    ├── plan.md                       # Plan content
    └── plan.meta.json                # Metadata with clarifications
```

## Testing

All features thoroughly tested:

```bash
node test-clarifying-questions.js

✅ 15/15 tests passed
```

Tests cover:
- ClarifyingQuestions class functionality
- PlanEditor enhanced methods
- Save/load persistence
- Metadata management
- Integration with chat

## Examples

### Example 1: Creating a Feature Plan

```bash
You: /plan create Add user profile page

❓ Clarifications (3 questions):

[1/3] What is the expected timeline?
  > Days

[2/3] What is the priority?
  > High

[3/3] Are there any dependencies?
  > Need user authentication working

Enter initial tasks: Design UI, Create components, Add API endpoints, Write tests

✅ Plan created!
```

### Example 2: Clarifying Scope

```bash
You: /clarify

? What would you like to clarify?
  > Feature scope and boundaries

[1/3] What is included in this feature?
  > User profile view and edit functionality

[2/3] What is explicitly excluded?
  > Profile pictures and social features

[3/3] What are the edge cases?
  > Handle users with incomplete profiles

✅ Clarifications saved to plan!
```

### Example 3: Mid-Task Clarification

```bash
You: continue implementing the API

🤖 Bot: Before I continue, I need to clarify:

❓ Should we paginate the results?
  > Yes
    No

You: Yes

❓ What page size?
  > 20 items

🤖 Bot: Got it. Implementing with pagination (20 items per page)...
```

## Best Practices

1. **Ask Early**: Use `/clarify` at the start of complex tasks
2. **Be Specific**: Provide detailed answers to clarifications
3. **Update Plans**: Use `/plan update` when requirements change
4. **Review Clarifications**: Check `/plan show` to see all decisions
5. **Save Context**: Clarifications provide valuable context for AI

## Future Enhancements

- [ ] AI-generated clarifying questions based on task complexity
- [ ] Clarification templates for common scenarios
- [ ] Export clarifications to documentation
- [ ] Link clarifications to specific tasks
- [ ] Suggest follow-up questions based on answers

---

**Status**: ✅ Implemented and tested  
**Version**: v3.2.0  
**Date**: 2024-02-17
