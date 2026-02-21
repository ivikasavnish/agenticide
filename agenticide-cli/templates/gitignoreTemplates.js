// Language-Specific .gitignore Templates
// Used by stub generator when creating new projects

const GITIGNORE_TEMPLATES = {
    'rust': `# Rust / Cargo
target/
Cargo.lock
**/*.rs.bk
*.pdb

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db
`,

    'go': `# Go
*.exe
bin/
pkg/
vendor/
*.test
*.out
go.work

# IDE
.idea/
.vscode/

# OS
.DS_Store
Thumbs.db
`,

    'javascript': `# Node.js
node_modules/
npm-debug.log*
dist/
build/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
`,

    'typescript': `# Node.js & TypeScript
node_modules/
*.tsbuildinfo
dist/
build/

# Environment
.env

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`,

    'python': `# Python
__pycache__/
*.pyc
.venv/
venv/
dist/
*.egg-info/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`
};

module.exports = { GITIGNORE_TEMPLATES };
