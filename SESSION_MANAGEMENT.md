# Session Management & Auto-Compaction

Complete guide to Agenticide's session management and auto-compaction features.

## 📁 Session Management

### Overview
Save and resume chat sessions with full context restoration. Never lose your work!

### Features
- **Named Sessions**: Save with custom names or auto-generated timestamps
- **Continue**: Resume from last session automatically
- **Full Context**: Restores messages, tasks, and project context
- **Metadata Tracking**: Created, updated, message count, directory
- **Session Analytics**: Statistics and insights
- **Auto-Cleanup**: Remove old sessions (>30 days)

### Usage

#### Start with Named Session
```bash
# Create or resume named session
agenticide chat --session my-project

# Continue from last session
agenticide chat --continue
agenticide chat -c
```

#### In-Chat Commands
```bash
# List all sessions
/sessions

# Save current session
/session save
/session save my-work-session

# Load a session
/session load my-work-session
```

### Session Data Structure
```json
{
  "name": "session-2026-02-15-11-30-00",
  "createdAt": "2026-02-15T11:30:00.000Z",
  "updatedAt": "2026-02-15T12:45:00.000Z",
  "messageCount": 25,
  "context": {
    "cwd": "/Users/user/project",
    "symbols": 150,
    "tasks": 10
  },
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "tasks": [...],
  "metadata": {}
}
```

### Session Storage
- **Location**: `~/.agenticide/sessions/`
- **Format**: JSON files (`session-name.json`)
- **Metadata**: `metadata.json` (index)
- **Last Session**: `.last-session` (reference)

### API

#### SessionManager Class
```javascript
const SessionManager = require('./core/sessionManager');
const sm = new SessionManager();

// Save session
const result = sm.saveSession('my-session', {
  messages: chatHistory,
  context: projectContext,
  tasks: currentTasks
});

// Load session
const loaded = sm.loadSession('my-session');
if (loaded.success) {
  chatHistory = loaded.session.messages;
}

// List sessions
const sessions = sm.listSessions();
sm.displaySessions(sessions);

// Delete session
sm.deleteSession('old-session');

// Clean old sessions (>30 days)
sm.cleanOldSessions(30);

// Get statistics
const stats = sm.getStatistics();
```

### Session Display
```
📁 Available Sessions:

  1. my-auth-work
     45 messages • 15/2/2026, 11:30:00 am (125KB)
     /Users/user/voter-app-rust

  2. database-refactor
     32 messages • 14/2/2026, 3:15:00 pm (98KB)
     /Users/user/agenticide

  3. session-2026-02-13-09-22-15
     18 messages • 13/2/2026, 9:22:15 am (65KB)
     /Users/user/functionlib
```

---

## 🧹 Auto-Compaction

### Overview
Automatic cleanup and optimization of git repos, databases, cache, and sessions.

### Features
- **Git Compaction**: `git gc --auto` + prune unreachable objects
- **Database Optimization**: SQLite VACUUM + ANALYZE
- **Cache Cleanup**: Remove old cache entries
- **Session Cleanup**: Delete sessions >30 days old
- **Auto-Run**: Executes silently on startup
- **Manual Trigger**: Run anytime with `/compact`

### Usage

#### Automatic (Default)
```bash
# Runs on every startup
agenticide chat
```

#### Disable Auto-Compaction
```bash
# Skip compaction on startup
agenticide chat --no-compact
```

#### Manual Compaction
```bash
# In chat, run compaction manually
/compact
```

### What Gets Compacted

#### 1. Git Repository
- Runs `git gc --auto` (safe, only if needed)
- Prunes unreachable objects (>2 weeks old)
- Removes `gc.log` warning file
- Reports space saved

#### 2. Database (SQLite)
- Runs `VACUUM` to reclaim space
- Runs `ANALYZE` to update statistics
- Compacts fragmented database
- Reports space saved

#### 3. Cache (Redis/File)
- Removes expired entries
- Cleans up orphaned data
- Reports cleanup status

#### 4. Sessions
- Deletes sessions older than 30 days
- Keeps metadata updated
- Reports number deleted

### Compaction Results Display
```
🧹 Auto Compaction Results:

  ✓ Git: saved 2.3MB
  ✓ Database: saved 450KB
  ✓ Cache: cleaned
  ✓ Sessions: cleaned 3 old sessions
```

### API

#### AutoCompaction Class
```javascript
const AutoCompaction = require('./core/autoCompaction');

// Create instance
const compaction = new AutoCompaction({
  verbose: true,
  gitRepoPath: process.cwd(),
  dbPath: '/path/to/cli.db',
  sessionsDir: '/path/to/sessions'
});

// Run all compactions
const results = await compaction.runAll();

// Run specific compactions
await compaction.compactGit();
await compaction.compactDatabase();
await compaction.cleanCache();
await compaction.cleanSessions(30);

// Display results
compaction.displayResults(results);

// Run on startup (silent)
await AutoCompaction.runOnStartup({
  gitRepoPath: process.cwd(),
  dbPath: dbPath,
  sessionsDir: sessionsDir
});
```

### Safety

#### Git Compaction
- Uses `--auto` flag (only runs if needed)
- Safe to run frequently
- No data loss risk
- Prunes only unreachable objects

#### Database Compaction
- Creates temporary copy during VACUUM
- Atomic operation
- Safe to run anytime
- No data loss risk

#### Session Cleanup
- Only deletes >30 days old
- Preserves recent sessions
- Configurable retention period
- Safe deletion

---

## 🚀 Workflows

### Daily Development Workflow
```bash
# Start work (continue from yesterday)
agenticide chat --continue

# Work on your code...
# Chat history and context restored

# End of day (auto-saves on exit)
```

### Project-Based Workflow
```bash
# Start session for specific project
agenticide chat --session voter-app-auth

# Work on authentication module...

# Switch to another project
agenticide chat --session functionlib-refactor

# Return to first project
agenticide chat --session voter-app-auth
```

### Cleanup Workflow
```bash
# Manual compaction
agenticide chat
/compact

# View sessions
/sessions

# Delete old session
/session delete old-session-name
```

---

## 📊 Statistics

### Session Statistics
```javascript
{
  totalSessions: 15,
  totalMessages: 450,
  averageMessages: 30,
  totalSize: "12.5MB",
  oldestSession: "session-2026-01-15",
  newestSession: "session-2026-02-15"
}
```

### Compaction Benefits
- **Git**: Reduces `.git` size by 10-50%
- **Database**: Reclaims 20-40% fragmented space
- **Sessions**: Frees 50-200MB from old sessions
- **Startup**: Faster with optimized database
- **Performance**: Better git operations

---

## ⚙️ Configuration

### Session Settings
- **Default location**: `~/.agenticide/sessions/`
- **Auto-save**: On exit (if named session)
- **Retention**: 30 days (configurable)
- **Max size**: No limit

### Compaction Settings
- **Git gc**: Auto mode (safe)
- **Prune age**: 2 weeks
- **Database**: VACUUM + ANALYZE
- **Session age**: 30 days
- **Startup**: Enabled by default

---

## 🔧 Troubleshooting

### Session Not Loading
```bash
# Check if session exists
/sessions

# Try different session name
/session load correct-name
```

### Compaction Fails
```bash
# Skip problematic compaction
agenticide chat --no-compact

# Run manual compaction to see errors
/compact
```

### Git GC Warnings
Auto-compaction fixes the common `gc.log` warnings by:
1. Running `git prune`
2. Removing `.git/gc.log`
3. Completing the gc cycle

---

## 📝 Best Practices

### Sessions
1. **Use Named Sessions**: Easier to find and resume
2. **Save Frequently**: Use `/session save` during long sessions
3. **Clean Old Sessions**: Review `/sessions` monthly
4. **Descriptive Names**: Use project or feature names

### Compaction
1. **Keep Enabled**: Let it run automatically
2. **Manual Runs**: After big changes or imports
3. **Monitor Space**: Check results occasionally
4. **Git Prune**: Let auto-compaction handle it

---

## 🎯 Examples

### Example 1: Multi-Project Developer
```bash
# Monday: Work on project A
agenticide chat --session project-a-auth
# ... code authentication ...
exit

# Tuesday: Work on project B  
agenticide chat --session project-b-ui
# ... build UI components ...
exit

# Wednesday: Back to project A
agenticide chat --session project-a-auth
# Context restored! Continue where left off
```

### Example 2: Long-Running Session
```bash
# Start session
agenticide chat --session big-refactor

# After 2 hours
/session save big-refactor-checkpoint-1

# After 4 hours (disaster strikes!)
/session load big-refactor-checkpoint-1
# Restored to 2-hour mark!
```

### Example 3: Cleanup
```bash
# Start chat
agenticide chat

# Check sessions
/sessions

# See old session from last month
# Auto-compaction will clean it (>30 days)

# Or manually trigger
/compact
# Cleaned 5 old sessions
```

---

## 🎉 Summary

**Session Management** gives you:
- ✅ Never lose chat history
- ✅ Resume work instantly
- ✅ Context switching between projects
- ✅ Checkpoint important states
- ✅ Auto-cleanup of old sessions

**Auto-Compaction** gives you:
- ✅ Optimized git repositories
- ✅ Faster database operations
- ✅ No gc.log warnings
- ✅ Automatic space reclamation
- ✅ Better performance

**Together**, they make Agenticide professional-grade for long-term development work!

---

**Created**: February 15, 2026  
**Version**: 3.1.0
