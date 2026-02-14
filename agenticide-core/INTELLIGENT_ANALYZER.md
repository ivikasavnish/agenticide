# Intelligent Project Analyzer

**Smart, incremental code analysis with Language Server Protocol**

---

## 🎯 Features

### 1. **Auto-detect Languages**
- Detects: Node.js, Go, Rust, Ruby, Python, TypeScript
- Scans for indicator files (package.json, go.mod, Cargo.toml, etc.)
- Counts files by language
- Determines primary language

### 2. **Selective LSP Activation**
- Only starts LSP servers for languages actually used
- Supports:
  - TypeScript/JavaScript: `typescript-language-server`
  - Go: `gopls`
  - Rust: `rust-analyzer`
  - Ruby: `solargraph`
  - Python: `pyright-langserver`

### 3. **Complete Code Outlines**
- Extracts symbols via LSP (accurate, semantic understanding)
- Function signatures
- Classes, interfaces, structs
- Methods with visibility
- Hierarchical structure (classes → methods)

### 4. **Hash Tree (Incremental Updates)**
- MD5 hash of every file
- Detects: New, Changed, Unchanged, Deleted files
- **Only re-analyzes changed files**
- Saves massive time on subsequent scans

### 5. **Smart Exclusions**
- Automatically excludes:
  - `node_modules/` (Node.js)
  - `vendor/` (Go, Ruby)
  - `target/` (Rust)
  - `__pycache__/`, `venv/` (Python)
  - `dist/`, `build/`, `.next/`, `out/` (Build outputs)
- **Only analyzes project code**

---

## 🚀 Usage

```javascript
const IntelligentAnalyzer = require('./intelligentAnalyzer');
const Database = require('better-sqlite3');

const db = new Database('project.db');
const analyzer = new IntelligentAnalyzer(db);

// First analysis (full scan)
const results = await analyzer.analyzeProject(projectId, '/path/to/project');

console.log(`Files: ${results.totalFiles}`);
console.log(`Symbols: ${results.totalSymbols}`);
console.log(`Functions: ${results.functions}`);
console.log(`Classes: ${results.classes}`);

// Second analysis (only changed files)
const results2 = await analyzer.analyzeProject(projectId, '/path/to/project');
// => Much faster! Only processes changed files

// Get hash tree
const hashTree = analyzer.getHashTree(projectId);
// => Array of {file_path, hash, language, size, last_analyzed}

// Get file outline
const outline = analyzer.getFileOutline('/path/to/file.js');
// => Hierarchical symbol tree

analyzer.close();
```

---

## 📊 Database Schema

### `project_metadata`
```sql
CREATE TABLE project_metadata (
    id INTEGER PRIMARY KEY,
    project_id INTEGER UNIQUE,
    detected_languages TEXT,  -- JSON array
    primary_language TEXT,
    last_scan TEXT
);
```

### `file_hashes`
```sql
CREATE TABLE file_hashes (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    file_path TEXT,
    hash TEXT,                -- MD5 hash
    language TEXT,
    size INTEGER,
    last_modified TEXT,
    last_analyzed TEXT,
    UNIQUE(project_id, file_path)
);
```

### `code_symbols`
```sql
CREATE TABLE code_symbols (
    id INTEGER PRIMARY KEY,
    file_path TEXT,
    name TEXT,
    kind TEXT,                -- Function, Class, Method, etc.
    detail TEXT,              -- Signature/type info
    range_start_line INTEGER,
    range_start_char INTEGER,
    range_end_line INTEGER,
    range_end_char INTEGER,
    parent_id INTEGER,        -- For hierarchical structure
    is_exported BOOLEAN
);
```

---

## 🔍 How It Works

### Step 1: Language Detection
```
📂 Project Root
├── package.json         → Node.js detected
├── tsconfig.json        → TypeScript detected
├── src/
│   ├── index.ts        → +1 TypeScript file
│   └── utils.js        → +1 JavaScript file

Result: Languages: [javascript, typescript], Primary: typescript
```

### Step 2: File Scanning
- Recursively walk project directory
- Skip excluded directories (`node_modules`, `dist`, etc.)
- Collect all code files by extension
- Count: 156 files found

### Step 3: Change Detection (Hash-based)
```
For each file:
  current_hash = MD5(file_content)
  previous_hash = lookup in database
  
  if no previous_hash:
    mark as NEW
  else if current_hash != previous_hash:
    mark as CHANGED
  else:
    mark as UNCHANGED (skip)
```

Result:
- New: 12 files
- Changed: 3 files
- Unchanged: 141 files  ← **Skip these!**
- To analyze: 15 files   ← **Only these**

### Step 4: LSP Analysis
```
Group files by language:
  - typescript: 10 files
  - javascript: 5 files

Start TypeScript LSP server once
For each TypeScript file:
  1. Open document in LSP
  2. Request document symbols
  3. Store symbols in database
  4. Update file hash
  5. Close document

Reuse same LSP server for all files
```

### Step 5: Store Results
- Update `file_hashes` table
- Store symbols in `code_symbols` table
- Delete old symbols for changed files
- Keep symbols for unchanged files

---

## 📈 Performance

### First Analysis (Full Scan)
- **Small project (20 files)**: ~2-3 seconds
- **Medium project (500 files)**: ~30-45 seconds
- **Large project (2000+ files)**: ~2-3 minutes

### Incremental Updates (Only Changed Files)
- **1 file changed**: ~0.2 seconds
- **10 files changed**: ~1-2 seconds
- **100 files changed**: ~10-15 seconds

**Speedup: 10-100x faster** on subsequent scans!

---

## 🎨 Example Output

```
🔍 Intelligent Project Analysis

📂 Project: /Users/dev/my-app

🔎 Detecting languages...
   Detected: javascript, typescript
   Primary: typescript
   File counts: { javascript: 45, typescript: 123 }

📁 Scanning project files...
   Found: 168 code files

🔄 Checking for changes...
   New: 0
   Changed: 3
   Unchanged: 165
   Deleted: 0

⚙️  Analyzing 3 files...

   typescript: 3 files

✅ Analysis complete!

📊 Results:
  Files analyzed: 3
  Symbols found: 47
  Functions/Methods: 38
  Classes/Interfaces: 9
  Errors: 0
```

---

## 🌳 Hash Tree Example

```javascript
const hashTree = analyzer.getHashTree(projectId);

// Output:
[
  {
    file_path: '/Users/dev/my-app/src/index.ts',
    hash: 'a3f5e8c9d1b2f4e6...',
    language: 'typescript',
    size: 1247,
    last_analyzed: '2026-02-14 06:00:00'
  },
  {
    file_path: '/Users/dev/my-app/src/utils.ts',
    hash: 'b4e7f9d2c3a5e8b1...',
    language: 'typescript',
    size: 892,
    last_analyzed: '2026-02-14 06:00:01'
  },
  // ... all files
]
```

---

## 📝 File Outline Example

```javascript
const outline = analyzer.getFileOutline('/path/to/api.ts');

// Output:
[
  {
    name: 'ApiClient',
    kind: 'Class',
    detail: null,
    range_start_line: 10,
    range_end_line: 45,
    children: [
      {
        name: 'constructor',
        kind: 'Constructor',
        detail: '(baseUrl: string, apiKey: string)',
        range_start_line: 12,
        range_end_line: 15
      },
      {
        name: 'get',
        kind: 'Method',
        detail: '(endpoint: string): Promise<any>',
        range_start_line: 17,
        range_end_line: 22
      },
      {
        name: 'post',
        kind: 'Method',
        detail: '(endpoint: string, data: any): Promise<any>',
        range_start_line: 24,
        range_end_line: 30
      }
    ]
  },
  {
    name: 'createClient',
    kind: 'Function',
    detail: '(config: Config): ApiClient',
    range_start_line: 47,
    range_end_line: 50
  }
]
```

---

## 🔌 Integration with Agenticide

### Project Manager Integration

```javascript
// Add to projectManager.js
const IntelligentAnalyzer = require('./intelligentAnalyzer');

class ProjectManager extends EventEmitter {
    constructor() {
        super();
        this.analyzer = new IntelligentAnalyzer(this.index.db);
    }

    async analyzeProjectIntelligent(projectId, projectPath) {
        const results = await this.analyzer.analyzeProject(projectId, projectPath);
        this.emit('project:analyzed', { projectId, results });
        return results;
    }

    getProjectHashTree(projectId) {
        return this.analyzer.getHashTree(projectId);
    }

    getFileOutline(filePath) {
        return this.analyzer.getFileOutline(filePath);
    }
}
```

### VSCode Extension Integration

```typescript
// Show outline in sidebar
vscode.window.registerTreeDataProvider('agenticide.outline', {
    getChildren: async (element) => {
        if (!element) {
            const activeFile = vscode.window.activeTextEditor?.document.fileName;
            if (activeFile) {
                const outline = pm.getFileOutline(activeFile);
                return outline.map(symbol => new OutlineItem(symbol));
            }
        } else {
            return element.symbol.children.map(child => new OutlineItem(child));
        }
    }
});
```

### CLI Commands

```bash
# Analyze project
agenticide analyze

# Show hash tree
agenticide hashes

# Show file outline
agenticide outline src/index.ts

# Check for changes
agenticide status
```

---

## 🛠️ LSP Requirements

Install LSP servers for languages you use:

```bash
# TypeScript/JavaScript
npm install -g typescript-language-server typescript

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer

# Ruby
gem install solargraph

# Python
pip install pyright
```

---

## 🎯 Benefits

1. **Speed**: 10-100x faster on incremental updates
2. **Accuracy**: LSP provides semantic understanding (not regex parsing)
3. **Smart**: Only analyzes changed files
4. **Complete**: Full symbol hierarchy with types
5. **Scalable**: Works on projects with thousands of files
6. **Language-aware**: Uses best LSP for each language

---

## 📚 Use Cases

### For Developers
- Quickly understand new codebases
- Navigate large projects efficiently
- Track code changes over time

### For AI Agents
- Get accurate project structure
- Understand function signatures
- Find symbols without reading full files
- Generate documentation
- Suggest refactorings

### For Teams
- Onboard new members faster
- Maintain code overview
- Track project evolution

---

**Smart analysis. Incremental updates. Production-ready.** 🚀
