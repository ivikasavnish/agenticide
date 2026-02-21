# Context Attachment - Quick Start Guide

## Installation

Already included in Agenticide CLI v3.1.1+

## Basic Usage

### Attach a Single File

```bash
$ agenticide chat

You: Can you review @src/app.js for security issues?

📎 Attached Context:
  📄 src/app.js (150 lines) [git://src/app.js#main@abc1234]

🤖 copilot:
I've reviewed src/app.js. Here are the security concerns I found:
1. SQL injection vulnerability on line 45...
```

### Attach Multiple Files

```bash
You: Compare @package.json and @package-lock.json

📎 Attached Context:
  📄 package.json (45 lines) [git://package.json#main@abc1234]
  📄 package-lock.json (2500 lines) [git://package-lock.json#main@abc1234]

🤖 copilot:
Comparing both files, I notice:
- package.json lists 12 dependencies
- package-lock.json has resolved to 145 total packages...
```

### File with Spaces in Name

```bash
You: Check @"my config file.json"

📎 Attached Context:
  📄 my config file.json (30 lines) [not in git]
```

### Paste Content

```bash
You: [Paste error stack trace - just paste it directly!]
Error: Cannot find module 'boxen'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1420:15)
    at Module._load (node:internal/modules/cjs/loader:1226:37)
    at Module.require (node:internal/modules/cjs/loader:1503:12)
    ...

📎 Attached Context:
  📋 Pasted content (8 lines)

🤖 copilot:
This is a missing dependency error. The 'boxen' module is not installed...
```

## Advanced Examples

### 1. Code Review Across Multiple Components

```bash
You: Review the authentication flow. Check:
@src/auth/middleware.js
@src/auth/controller.js
@src/models/User.js
@config/auth.json

📎 Attached Context:
  📄 src/auth/middleware.js (85 lines) [git://src/auth/middleware.js#feature-auth@def5678]
  📄 src/auth/controller.js (120 lines) [git://src/auth/controller.js#feature-auth@def5678]
  📄 src/models/User.js (200 lines) [git://src/models/User.js#main@abc1234]
  📄 config/auth.json (25 lines) [not in git]

🤖 copilot:
Reviewing the authentication flow across all 4 files:

1. Middleware (middleware.js):
   - Checks JWT tokens on line 25
   - Validates user permissions on line 45
   
2. Controller (controller.js):
   - Login handler on line 30
   - Password hashing uses bcrypt (good!)
   
3. User Model (User.js):
   - Schema definition looks secure
   - Recommend adding email validation
   
4. Config (auth.json):
   - JWT secret should be in environment variable, not config file!
```

### 2. Debugging with Context

```bash
You: I'm getting an error in @src/database.js. Here's the error:

[Paste error message]
TypeError: Cannot read property 'query' of undefined
    at Database.execute (src/database.js:45:18)
    at async UserService.findById (src/services/user.js:12:20)

📎 Attached Context:
  📄 src/database.js (180 lines) [git://src/database.js#main@abc1234]
  📋 Pasted content (3 lines)

🤖 copilot:
Looking at line 45 in database.js, the issue is that `this.connection` is undefined.
This happens because the connection hasn't been established yet.

Fix: Add a check before executing:
```javascript
if (!this.connection) {
  throw new Error('Database not connected');
}
```
```

### 3. Architecture Understanding

```bash
You: How does the application bootstrap? Trace from:
@index.js
@src/app.js
@src/routes/index.js
@src/middleware/index.js

📎 Attached Context:
  📄 index.js (25 lines) [git://index.js#main@abc1234]
  📄 src/app.js (100 lines) [git://src/app.js#main@abc1234]
  📄 src/routes/index.js (60 lines) [git://src/routes/index.js#main@abc1234]
  📄 src/middleware/index.js (40 lines) [git://src/middleware/index.js#main@abc1234]

🤖 copilot:
Here's the bootstrap flow:

1. index.js (entry point)
   - Loads environment variables
   - Creates Express app by requiring src/app.js
   - Starts server on port 3000

2. src/app.js
   - Initializes Express
   - Loads middleware from src/middleware/index.js
   - Mounts routes from src/routes/index.js
   - Sets up error handlers
   - Exports app instance

3. src/middleware/index.js
   - Registers body-parser
   - Adds CORS
   - Sets up authentication middleware
   - Adds logging

4. src/routes/index.js
   - Defines API routes
   - Maps endpoints to controllers
   - Applies route-specific middleware

Flow: index.js → app.js → middleware → routes → controllers
```

### 4. Documentation with Files

```bash
You: Generate API documentation for these endpoints:
@src/routes/users.js
@src/routes/posts.js
@src/controllers/users.js
@src/controllers/posts.js

Include request/response examples from @docs/api-examples.md

📎 Attached Context:
  📄 src/routes/users.js (50 lines)
  📄 src/routes/posts.js (45 lines)
  📄 src/controllers/users.js (200 lines)
  📄 src/controllers/posts.js (180 lines)
  📄 docs/api-examples.md (100 lines)

🤖 copilot:
# API Documentation

## Users API

### GET /api/users
Returns list of all users...
[Generated comprehensive docs based on all files]
```

## Pro Tips

### 1. Use Relative Paths

Both of these work:
```bash
# From project root
You: @src/app.js

# From src/ directory
You: @app.js
```

### 2. Git Branch Context

When working on a feature branch, git context is automatic:
```bash
# On branch: feature-auth
You: Review @src/auth.js

📎 Attached Context:
  📄 src/auth.js (120 lines) [git://src/auth.js#feature-auth@def5678]
                                                    ^^^^^^^^^^^^
                                            Shows your current branch!
```

### 3. Session Replay

Since attachments are saved with git info, you can:
- Resume sessions and see exact file versions discussed
- Reference past discussions with specific code versions
- Track how code evolved across sessions

### 4. Combine with Other Commands

```bash
# With /read command
You: /read @src/app.js
# Shows file in formatted view

# With analysis
You: Analyze dependencies in @package.json and suggest optimizations

# With code generation
You: Based on @src/models/User.js, generate a similar model for Posts
```

## File Types Supported

✅ Supported:
- Source code (.js, .ts, .py, .java, .go, .rs, etc.)
- Config files (.json, .yaml, .toml, .ini, etc.)
- Documentation (.md, .txt, .rst, etc.)
- Data files (.csv, .xml, etc.)

❌ Not Supported:
- Binary files (.exe, .dll, .so, etc.)
- Images (.png, .jpg, .gif, etc.)
- Large files (>1MB by default)

## Troubleshooting

### File Not Found

```bash
⚠️  Attachment Warnings:
  @unknown.js: File not found
```

**Solutions:**
1. Check file path: `ls src/unknown.js`
2. Use tab completion (future feature)
3. Use quotes for spaces: `@"my file.js"`

### Git Info Missing

```bash
📄 src/app.js (150 lines) [not in git]
```

**Why:**
- File not tracked by git
- Not in a git repository
- File is in .gitignore

**To fix:**
```bash
git add src/app.js
git commit -m "Add app.js"
```

### Paste Not Detected

**Requirements for auto-detection:**
- At least 4 lines
- Contains newline characters

**Manual workaround:**
1. Save to file: `pbpaste > temp.txt`
2. Attach: `@temp.txt`

## Next Steps

1. Try it: `agenticide chat`
2. Attach files with `@filename`
3. Paste error messages directly
4. Review `docs/CONTEXT_ATTACHMENTS.md` for details

Happy coding! 🚀
