# 🚀 Agenticide v3.1.0 Release Notes

**Release Date:** February 16, 2026  
**Type:** Feature Release  
**Status:** Stable ✅

---

## 🎯 Highlights

This release adds **three major features** to make Agenticide a complete development environment:

1. **API Runner Extension** - Test REST APIs without leaving the CLI
2. **SQL Runner Extension** - Query and manage databases instantly  
3. **Intelligent Hint System** - Context-aware autocomplete and suggestions

---

## ✨ What's New

### 🌐 API Runner Extension

A full-featured REST API client built directly into the CLI.

**Key Features:**
- All HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Custom headers and authentication
- Request/response history
- Save and reload requests
- Automatic JSON detection
- Response timing and metrics

**Example Usage:**
```bash
/api get https://api.github.com/users/octocat
/api post https://api.example.com/data '{"key":"value"}'
/api get https://api.com/protected -H "Authorization: Bearer token"
```

### 🗄️ SQL Runner Extension

Execute SQL queries and manage database connections.

**Key Features:**
- SQLite support (built-in)
- Multiple database connections
- Query execution with timing
- Schema inspection (tables, columns)
- SQL file execution
- Query history tracking

**Example Usage:**
```bash
/sql connect sqlite ./myapp.db
/sql tables
/sql query SELECT * FROM users WHERE active = 1
/sql describe users
```

### 💡 Intelligent Hint System

Context-aware suggestions and autocomplete system.

**Key Features:**
- Command help with examples
- Contextual suggestions based on input
- Tab autocomplete for commands
- Typo detection and correction
- Recent command history
- Extension auto-discovery

**Example Behavior:**
```bash
You: /api<Enter>
→ Shows usage, examples, and available actions

You: "test https://..."
→ 💡 Tip: Use /api get <url> to test this endpoint

You: /pro<Tab>
→ /process
```

---

## 📊 Statistics

### Code Metrics
- **Total Extensions:** 9 (was 7)
- **Lines of Code:** 10,484 (was 9,554)
- **New Code:** +930 lines
- **Documentation:** 33 files
- **Commands:** 25+ available

### Extension Breakdown
| Extension | Lines | Status |
|-----------|-------|--------|
| API Runner | ~250 | 🆕 New |
| SQL Runner | ~350 | 🆕 New |
| Hint System | ~400 | 🆕 New |
| Process Manager | ~320 | ✅ Existing |
| Browser | ~200 | ✅ Existing |
| Docker | ~150 | ✅ Existing |
| Other (4) | ~600 | ✅ Existing |

---

## 🔧 Technical Details

### API Runner
- **File:** `extensions/api.js`
- **Dependencies:** None (pure Node.js)
- **Protocol Support:** HTTP, HTTPS
- **Size:** 7.5 KB
- **Performance:** ~100-500ms per request (network dependent)

### SQL Runner
- **File:** `extensions/sql.js`
- **Dependencies:** better-sqlite3 (already included)
- **Database Support:** SQLite (MySQL/Postgres coming)
- **Size:** 11 KB
- **Performance:** Sub-millisecond queries on small datasets

### Hint System
- **File:** `core/hintSystem.js`
- **Dependencies:** None
- **Algorithm:** Levenshtein distance for typo detection
- **Size:** 12.5 KB
- **Performance:** Instant (<1ms)

---

## 📚 Documentation

### New Documentation
- **NEW_FEATURES.md** - Detailed feature guide (7.6 KB)
- **EXTENSIONS_GUIDE.md** - Extension reference (5.1 KB)
- **FEATURES_SUMMARY.md** - Quick summary (7.4 KB)
- **RELEASE_NOTES.md** - This file

### Updated Documentation
- **README.md** - Updated with new features
- **BUILD_SUMMARY.md** - Build instructions

---

## 🚀 Getting Started

### Installation

**Existing Users (Update):**
```bash
cd agenticide
git pull origin main
```

**New Users (Install):**
```bash
git clone https://github.com/ivikasavnish/agenticide.git
cd agenticide
./install.sh
```

### Quick Start

```bash
# Start Agenticide
agenticide

# Try new features
You: /help                          # See all commands
You: /api get https://httpbin.org/json
You: /sql connect sqlite ./example.db
You: /process start npm run dev
```

---

## 💡 Usage Examples

### Full Stack Development Workflow

```bash
# 1. Start your development server
/process start npm run dev

# 2. Connect to your database
/sql connect sqlite ./app.db

# 3. Test your API
/api get http://localhost:3000/health
/api post http://localhost:3000/api/users '{"name":"test"}'

# 4. Check database changes
/sql query SELECT * FROM users ORDER BY created_at DESC LIMIT 5

# 5. View server logs
/process logs 1

# 6. Use hints for help
/api<Enter>  # See API usage help
```

### API Testing

```bash
# Test public API
/api get https://api.github.com/zen

# Test with authentication
/api get https://api.example.com/profile \
  -H "Authorization: Bearer your-token"

# POST data
/api post https://api.example.com/users \
  '{"name":"John","email":"john@example.com"}'

# Save for later
/api save production-endpoint
/api load production-endpoint
```

### Database Operations

```bash
# Connect
/sql connect sqlite ./production.db

# Explore schema
/sql tables
/sql describe users

# Query data
/sql query SELECT u.*, COUNT(o.id) as order_count 
  FROM users u 
  LEFT JOIN orders o ON u.id = o.user_id 
  GROUP BY u.id 
  LIMIT 10

# Run migrations
/sql file ./migrations/001_add_indexes.sql

# Check history
/sql history
```

---

## 🔄 Upgrade Notes

### Breaking Changes
- None! This is a backward-compatible release.

### New Dependencies
- None! Uses existing dependencies.

### Configuration Changes
- Extensions auto-load by default
- No configuration required

### Binary Size
- macOS ARM64: ~56MB (unchanged)
- Includes all new features

---

## 🐛 Bug Fixes

None in this release (feature-only update).

---

## 🔮 Coming Soon

### Planned Features
- MySQL support for SQL Runner
- PostgreSQL support for SQL Runner
- GraphQL support for API Runner
- API mock server
- Database schema export
- Query builder UI
- WebSocket testing
- Request templating

### Community Requests
- Windows build automation
- Linux x86/ARM builds
- VS Code extension integration
- Remote database connections

---

## 📝 Changelog

### Added
- ✅ API Runner extension (`/api`)
- ✅ SQL Runner extension (`/sql`)
- ✅ Intelligent hint system with autocomplete
- ✅ Tab completion for commands
- ✅ Typo detection and correction
- ✅ Contextual suggestions
- ✅ Request/response history (API)
- ✅ Query history (SQL)
- ✅ Multiple database connections
- ✅ Custom header support (API)
- ✅ Schema inspection (SQL)

### Improved
- Extension system now supports 9 extensions
- Command discovery with hints
- Developer experience with autocomplete
- Documentation coverage (+3 files)
- Code organization

### Fixed
- N/A (no bug fixes in this release)

---

## 🎯 Comparison

### Before (v3.0.0)
- 7 extensions
- Basic chat interface
- Code generation
- Process management
- Git integration

### After (v3.1.0)
- **9 extensions** (+2)
- Everything from v3.0.0
- **REST API testing**
- **Database querying**
- **Intelligent autocomplete**
- **Context-aware hints**
- **Enhanced DX**

---

## 👥 Contributors

- Agenticide Team
- Built with assistance from GitHub Copilot CLI

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🔗 Links

- **Repository:** https://github.com/ivikasavnish/agenticide
- **Documentation:** `docs/` folder
- **Issues:** https://github.com/ivikasavnish/agenticide/issues
- **Releases:** https://github.com/ivikasavnish/agenticide/releases

---

## 💬 Support

Need help?
- Read the documentation in `docs/`
- Type `/help` in the CLI
- Open an issue on GitHub
- Check examples in this file

---

## 🙏 Acknowledgments

Thanks to:
- Better-sqlite3 team for the SQLite driver
- Node.js community for HTTP/HTTPS modules
- Chalk, Inquirer, Ora for CLI beauty
- GitHub Copilot for development assistance

---

## 🎉 Get Started Now!

```bash
# Update to v3.1.0
git pull

# Start using new features
agenticide

# Explore
You: /help
You: /api get https://api.github.com/zen
You: /sql connect sqlite ./test.db
```

**Happy coding! 🚀**

---

**Version:** 3.1.0  
**Build:** Stable  
**Date:** February 16, 2026  
**Extensions:** 9  
**Size:** ~56MB (macOS ARM64)
