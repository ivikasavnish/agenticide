# Context Attachment Feature

## Overview

The Agenticide CLI now supports attaching files and pasted content to your chat messages using the `@` symbol and automatic paste detection.

## Features

### 1. File Attachments with @ Symbol

Attach any file to your message by prefixing it with `@`:

```bash
You: Can you review @src/app.js for security issues?
You: Explain how @index.js and @package.json work together
You: Fix the bug in @"my file.js" (use quotes for files with spaces)
```

**What happens:**
- Files are read and attached to your message
- Content is sent to the AI with your prompt
- Git metadata is automatically tracked (branch, commit, relative path)
- File summary is shown: `[File: src/app.js (150 lines, git://src/app.js#main@abc1234)]`

### 2. Automatic Paste Detection

When you paste multi-line content (more than 3 lines), it's automatically:
- Saved to `~/.agenticide/attachments/`
- Tracked with timestamp and hash
- Attached to your message context
- Shown as: `📋 Pasted content (45 lines)`

### 3. Git-Aware Softlinks

All file attachments include git metadata when available:

```json
{
  "path": "/Users/you/project/src/app.js",
  "relativePath": "src/app.js",
  "gitTracked": true,
  "gitRoot": "/Users/you/project",
  "branch": "main",
  "commit": "abc1234567890...",
  "gitUrl": "git://src/app.js#main@abc1234"
}
```

This allows:
- Precise file version tracking
- Cross-branch code references
- Historical code lookup
- Session replay with exact file states

### 4. Session Attachment History

All attachments are saved with sessions:

```bash
~/.agenticide/attachments/
├── session-default-attachments.json
├── paste-default-1708171234567-a1b2c3d4.txt
├── paste-default-1708171234567-a1b2c3d4.txt.meta.json
└── ...
```

## Usage Examples

### Example 1: Code Review with Multiple Files

```bash
You: Review @src/auth.js and @tests/auth.test.js for completeness

📎 Attached Context:
  📄 src/auth.js (120 lines) [git://src/auth.js#main@abc1234]
  📄 tests/auth.test.js (85 lines) [git://tests/auth.test.js#main@abc1234]

🤖 copilot:
I've reviewed both files. Here are my findings:
...
```

### Example 2: Paste Error Message

```bash
You: [Paste multi-line error stack trace]
Error: Cannot find module 'boxen'
    at Module._resolveFilename (/node_modules/...)
    at Module._load (/node_modules/...)
    ...

📎 Attached Context:
  📋 Pasted content (15 lines)

🤖 copilot:
This error indicates a missing dependency...
```

### Example 3: Cross-File Analysis

```bash
You: How do @src/database.js and @src/models/User.js interact? Check @config/db.json too

📎 Attached Context:
  📄 src/database.js (200 lines) [git://src/database.js#feature-auth@def5678]
  📄 src/models/User.js (150 lines) [git://src/models/User.js#feature-auth@def5678]
  📄 config/db.json (20 lines) [not in git]

🤖 copilot:
These files interact as follows:
...
```

## Commands

### View Session Attachments

```bash
# In future versions
agenticide attachments list
agenticide attachments list --session my-session
agenticide attachments clean --older-than 30
```

### Git Context

The system automatically includes:
- Current branch
- Current commit hash
- Relative path from git root
- Repository root path

Example git URL: `git://src/app.js#main@abc1234`

Format: `git://<relative-path>#<branch>@<short-commit>`

## File Resolution

Files are searched in this order:
1. Relative to current working directory
2. Relative to git repository root (if in git repo)

Example:
```bash
# If you're in /project/src/
You: @models/User.js
# Resolves to: /project/src/models/User.js

# Or from git root
You: @src/models/User.js  
# Resolves to: /project/src/models/User.js
```

## Benefits

### 1. Precise Context
- AI gets exact file content you're asking about
- No ambiguity about which file or version
- Full context for accurate responses

### 2. Version Tracking
- Know exactly which version of code was discussed
- Can replay sessions with same code state
- Cross-reference with git history

### 3. Efficient Communication
- Attach multiple files in one message
- No need to copy-paste code manually
- Automatic file summary for reference

### 4. Session Persistence
- Attachments saved with sessions
- Can reload context when resuming
- Full audit trail of discussed files

## Implementation Details

### Storage Structure

```
~/.agenticide/
├── config.json
├── attachments/
│   ├── paste-{session}-{timestamp}-{hash}.txt
│   ├── paste-{session}-{timestamp}-{hash}.txt.meta.json
│   └── session-{session}-attachments.json
└── sessions/
    └── session-{timestamp}.json
```

### Metadata Format

**Pasted Content Metadata:**
```json
{
  "type": "paste",
  "timestamp": "2026-02-17T09:00:00.000Z",
  "sessionId": "my-session",
  "lines": 45,
  "size": 1234,
  "hash": "a1b2c3d4"
}
```

**File Attachment Metadata:**
```json
{
  "type": "file",
  "reference": "@src/app.js",
  "filename": "src/app.js",
  "path": "/full/path/to/src/app.js",
  "relativePath": "src/app.js",
  "gitTracked": true,
  "gitRoot": "/full/path/to",
  "branch": "main",
  "commit": "abc1234567890...",
  "gitUrl": "git://src/app.js#main@abc1234",
  "lines": 150,
  "size": 4567
}
```

## Configuration

Currently automatic. Future options:

```json
{
  "attachments": {
    "autoDetectPaste": true,
    "maxFileSize": 1048576,
    "allowedExtensions": ["js", "ts", "py", "java", "go"],
    "trackGitInfo": true,
    "cleanupDays": 30
  }
}
```

## Limitations

1. **File Size**: Large files may impact response time
2. **Binary Files**: Only text files supported
3. **Max Attachments**: Recommended max 5 files per message
4. **Git Required**: Git tracking only works in git repositories

## Future Enhancements

- [ ] Attachment viewer UI
- [ ] Image attachment support
- [ ] Compressed attachment storage
- [ ] Remote file attachment (URL)
- [ ] Diff attachment (@file1..@file2)
- [ ] Directory attachment (@src/)
- [ ] Wildcard support (@src/*.js)

## Troubleshooting

**File not found:**
```bash
⚠️  Attachment Warnings:
  @unknown.js: File not found
```
- Check file path is correct
- Use relative path from current directory or git root
- Use quotes for files with spaces: @"my file.js"

**Paste not detected:**
- Paste at least 4 lines for auto-detection
- Or save manually and attach with @filename

**Git info missing:**
- Ensure you're in a git repository
- Run `git status` to verify
- Git info shows as "not in git" for non-tracked files

## API Reference

See `agenticide-cli/core/contextAttachment.js` for implementation details.

Key methods:
- `parseFileReferences(message)` - Extract @file references
- `processMessage(message, sessionId)` - Process attachments
- `createGitLink(filePath)` - Generate git metadata
- `saveSessionAttachments(sessionId, attachments)` - Persist metadata
