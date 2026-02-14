/**
 * Project Templates - Cookiecutter-like project scaffolding
 * 
 * Features:
 * - Built-in templates for common project types
 * - Variable substitution in files and filenames
 * - Conditional file inclusion
 * - Custom template registry
 * - Template inheritance
 */

const fs = require('fs');
const path = require('path');

class ProjectTemplates {
    constructor(db) {
        this.db = db;
        this.templatesDir = path.join(require('os').homedir(), '.agenticide', 'templates');
        this.ensureTemplatesDir();
        this.initBuiltinTemplates();
    }

    ensureTemplatesDir() {
        if (!fs.existsSync(this.templatesDir)) {
            fs.mkdirSync(this.templatesDir, { recursive: true });
        }
    }

    /**
     * Initialize built-in templates
     */
    initBuiltinTemplates() {
        this.builtinTemplates = {
            'node-express': this.nodeExpressTemplate(),
            'node-cli': this.nodeCliTemplate(),
            'react-app': this.reactAppTemplate(),
            'typescript-lib': this.typescriptLibTemplate(),
            'python-flask': this.pythonFlaskTemplate(),
            'python-cli': this.pythonCliTemplate(),
            'vscode-extension': this.vscodeExtensionTemplate(),
            'rust-cli': this.rustCliTemplate()
        };
    }

    /**
     * Create project from template
     */
    async createFromTemplate(templateName, projectPath, variables = {}) {
        const template = this.builtinTemplates[templateName] || this.loadCustomTemplate(templateName);
        
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        console.log(`🎨 Creating project from template: ${templateName}`);
        
        // Merge default variables
        const vars = {
            project_name: path.basename(projectPath),
            project_slug: this.slugify(path.basename(projectPath)),
            author: process.env.USER || 'developer',
            year: new Date().getFullYear(),
            ...variables
        };

        // Create project directory
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
        }

        // Generate files
        for (const file of template.files) {
            // Skip conditional files
            if (file.condition && !this.evaluateCondition(file.condition, vars)) {
                continue;
            }

            const filePath = path.join(projectPath, this.processString(file.path, vars));
            const fileContent = this.processString(file.content, vars);
            
            // Create directory if needed
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(filePath, fileContent);
            
            // Set permissions if specified
            if (file.executable) {
                fs.chmodSync(filePath, 0o755);
            }
        }

        console.log(`✅ Project created at ${projectPath}`);
        
        // Run post-creation commands
        if (template.postCreate) {
            console.log('📦 Running post-creation commands...');
            for (const cmd of template.postCreate) {
                console.log(`  $ ${cmd}`);
                require('child_process').execSync(cmd, { cwd: projectPath, stdio: 'inherit' });
            }
        }

        return {
            path: projectPath,
            template: templateName,
            variables: vars
        };
    }

    /**
     * Process string with variable substitution
     */
    processString(str, vars) {
        let result = str;
        
        // Replace {{variable}} syntax
        for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            result = result.replace(regex, value);
        }
        
        return result;
    }

    /**
     * Evaluate condition
     */
    evaluateCondition(condition, vars) {
        // Simple condition evaluation
        // Format: "variable" or "!variable" or "variable == value"
        if (condition.startsWith('!')) {
            return !vars[condition.slice(1)];
        }
        
        if (condition.includes('==')) {
            const [left, right] = condition.split('==').map(s => s.trim());
            return vars[left] == right;
        }
        
        return !!vars[condition];
    }

    /**
     * Slugify string
     */
    slugify(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    /**
     * Node.js Express API template
     */
    nodeExpressTemplate() {
        return {
            name: 'Node.js Express API',
            description: 'Express.js REST API with TypeScript',
            files: [
                {
                    path: 'package.json',
                    content: `{
  "name": "{{project_slug}}",
  "version": "1.0.0",
  "description": "{{project_name}} - Express API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "keywords": [],
  "author": "{{author}}",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "jest": "^29.0.0"
  }
}`
                },
                {
                    path: 'tsconfig.json',
                    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`
                },
                {
                    path: 'src/index.ts',
                    content: `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from {{project_name}}!' });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});

export default app;
`
                },
                {
                    path: '.env',
                    content: `PORT=3000
NODE_ENV=development
`
                },
                {
                    path: '.gitignore',
                    content: `node_modules/
dist/
.env
*.log
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

Express.js REST API

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Endpoints

- \`GET /health\` - Health check
- \`GET /api/hello\` - Hello endpoint

## Build

\`\`\`bash
npm run build
npm start
\`\`\`
`
                }
            ],
            postCreate: ['npm install']
        };
    }

    /**
     * Node.js CLI template
     */
    nodeCliTemplate() {
        return {
            name: 'Node.js CLI Tool',
            description: 'Command-line tool with Commander.js',
            files: [
                {
                    path: 'package.json',
                    content: `{
  "name": "{{project_slug}}",
  "version": "1.0.0",
  "description": "{{project_name}} CLI",
  "main": "index.js",
  "bin": {
    "{{project_slug}}": "./index.js"
  },
  "scripts": {
    "test": "echo \\"No tests yet\\""
  },
  "keywords": ["cli"],
  "author": "{{author}}",
  "license": "MIT",
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^4.1.2",
    "inquirer": "^8.2.5",
    "ora": "^5.4.1"
  }
}`
                },
                {
                    path: 'index.js',
                    content: `#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const package = require('./package.json');

const program = new Command();

program
  .name('{{project_slug}}')
  .description('{{project_name}} CLI')
  .version(package.version);

program
  .command('hello')
  .description('Say hello')
  .argument('[name]', 'Name to greet')
  .action(async (name) => {
    if (!name) {
      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'What is your name?',
        default: 'World'
      }]);
      name = answers.name;
    }
    
    const spinner = ora('Processing...').start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    spinner.succeed();
    
    console.log(chalk.green(\`\\n👋 Hello, \${name}!\\n\`));
  });

program.parse();
`,
                    executable: true
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

CLI tool built with Node.js

## Installation

\`\`\`bash
npm install
npm link
\`\`\`

## Usage

\`\`\`bash
{{project_slug}} hello
{{project_slug}} hello Alice
\`\`\`
`
                },
                {
                    path: '.gitignore',
                    content: `node_modules/
*.log
`
                }
            ],
            postCreate: ['npm install']
        };
    }

    /**
     * React App template
     */
    reactAppTemplate() {
        return {
            name: 'React App',
            description: 'React app with Vite',
            files: [
                {
                    path: 'package.json',
                    content: `{
  "name": "{{project_slug}}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}`
                },
                {
                    path: 'vite.config.js',
                    content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`
                },
                {
                    path: 'index.html',
                    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{project_name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
                },
                {
                    path: 'src/main.jsx',
                    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`
                },
                {
                    path: 'src/App.jsx',
                    content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>{{project_name}}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  )
}

export default App
`
                },
                {
                    path: 'src/App.css',
                    content: `.App {
  text-align: center;
  padding: 2rem;
}
`
                },
                {
                    path: 'src/index.css',
                    content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen';
}
`
                },
                {
                    path: '.gitignore',
                    content: `node_modules/
dist/
.env
`
                }
            ],
            postCreate: ['npm install']
        };
    }

    /**
     * TypeScript Library template
     */
    typescriptLibTemplate() {
        return {
            name: 'TypeScript Library',
            description: 'Reusable TypeScript library',
            files: [
                {
                    path: 'package.json',
                    content: `{
  "name": "{{project_slug}}",
  "version": "1.0.0",
  "description": "{{project_name}}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [],
  "author": "{{author}}",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}`
                },
                {
                    path: 'tsconfig.json',
                    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}`
                },
                {
                    path: 'src/index.ts',
                    content: `/**
 * {{project_name}}
 */

export function hello(name: string = 'World'): string {
  return \`Hello, \${name}!\`;
}

export default {
  hello
};
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

TypeScript library

## Installation

\`\`\`bash
npm install {{project_slug}}
\`\`\`

## Usage

\`\`\`typescript
import { hello } from '{{project_slug}}';

console.log(hello('World'));
\`\`\`
`
                },
                {
                    path: '.gitignore',
                    content: `node_modules/
dist/
*.log
`
                }
            ],
            postCreate: ['npm install']
        };
    }

    /**
     * Python Flask API template
     */
    pythonFlaskTemplate() {
        return {
            name: 'Python Flask API',
            description: 'Flask REST API',
            files: [
                {
                    path: 'requirements.txt',
                    content: `Flask==2.3.0
python-dotenv==1.0.0
`
                },
                {
                    path: 'app.py',
                    content: `from flask import Flask, jsonify
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/hello')
def hello():
    return jsonify({'message': 'Hello from {{project_name}}!'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)
`
                },
                {
                    path: '.env',
                    content: `PORT=5000
FLASK_ENV=development
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

Flask REST API

## Setup

\`\`\`bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

## Run

\`\`\`bash
python app.py
\`\`\`
`
                },
                {
                    path: '.gitignore',
                    content: `venv/
__pycache__/
*.pyc
.env
`
                }
            ],
            postCreate: []
        };
    }

    /**
     * Python CLI template
     */
    pythonCliTemplate() {
        return {
            name: 'Python CLI',
            description: 'Python CLI with Click',
            files: [
                {
                    path: 'setup.py',
                    content: `from setuptools import setup

setup(
    name='{{project_slug}}',
    version='1.0.0',
    py_modules=['cli'],
    install_requires=[
        'click==8.1.0',
    ],
    entry_points={
        'console_scripts': [
            '{{project_slug}}=cli:cli',
        ],
    },
)
`
                },
                {
                    path: 'cli.py',
                    content: `import click

@click.group()
def cli():
    """{{project_name}} CLI"""
    pass

@cli.command()
@click.argument('name', default='World')
def hello(name):
    """Say hello"""
    click.echo(f'👋 Hello, {name}!')

if __name__ == '__main__':
    cli()
`
                },
                {
                    path: 'requirements.txt',
                    content: `click==8.1.0
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

Python CLI tool

## Installation

\`\`\`bash
pip install -e .
\`\`\`

## Usage

\`\`\`bash
{{project_slug}} hello
{{project_slug}} hello Alice
\`\`\`
`
                }
            ],
            postCreate: []
        };
    }

    /**
     * VSCode Extension template
     */
    vscodeExtensionTemplate() {
        return {
            name: 'VSCode Extension',
            description: 'Visual Studio Code extension',
            files: [
                {
                    path: 'package.json',
                    content: `{
  "name": "{{project_slug}}",
  "displayName": "{{project_name}}",
  "description": "VSCode extension",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./extension.js",
  "contributes": {
    "commands": [{
      "command": "{{project_slug}}.helloWorld",
      "title": "Hello World"
    }]
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0"
  }
}`
                },
                {
                    path: 'extension.js',
                    content: `const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('{{project_slug}}.helloWorld', function () {
        vscode.window.showInformationMessage('Hello from {{project_name}}!');
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

VSCode extension

## Development

1. Open in VSCode
2. Press F5 to debug
3. Run command: "Hello World"
`
                }
            ],
            postCreate: ['npm install']
        };
    }

    /**
     * Rust CLI template
     */
    rustCliTemplate() {
        return {
            name: 'Rust CLI',
            description: 'Rust command-line tool',
            files: [
                {
                    path: 'Cargo.toml',
                    content: `[package]
name = "{{project_slug}}"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.0", features = ["derive"] }
`
                },
                {
                    path: 'src/main.rs',
                    content: `use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "{{project_slug}}")]
#[command(about = "{{project_name}}", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Hello { name: Option<String> },
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Hello { name } => {
            let name = name.as_deref().unwrap_or("World");
            println!("👋 Hello, {}!", name);
        }
    }
}
`
                },
                {
                    path: 'README.md',
                    content: `# {{project_name}}

Rust CLI tool

## Build

\`\`\`bash
cargo build --release
\`\`\`

## Run

\`\`\`bash
cargo run -- hello
cargo run -- hello Alice
\`\`\`
`
                }
            ],
            postCreate: []
        };
    }

    /**
     * List available templates
     */
    listTemplates() {
        const templates = [];
        
        for (const [key, template] of Object.entries(this.builtinTemplates)) {
            templates.push({
                name: key,
                title: template.name,
                description: template.description
            });
        }
        
        return templates;
    }

    /**
     * Get template info
     */
    getTemplateInfo(templateName) {
        const template = this.builtinTemplates[templateName];
        if (!template) return null;
        
        return {
            name: templateName,
            title: template.name,
            description: template.description,
            files: template.files.map(f => f.path)
        };
    }
}

module.exports = ProjectTemplates;
