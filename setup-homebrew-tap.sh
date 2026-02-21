#!/bin/bash

# Homebrew Tap Setup Script
# This creates the homebrew-agenticide tap repository

set -e

echo "🍺 Setting up Homebrew Tap Repository"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found. Installing..."
    echo ""
    echo "Please run one of these:"
    echo "  brew install gh"
    echo "  Or manually create the repository on GitHub"
    echo ""
    exit 1
fi

# Check authentication
echo "📋 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "🔐 Not authenticated. Please login:"
    gh auth login
fi

# Create repository
REPO_NAME="homebrew-agenticide"
echo ""
echo "📦 Creating repository: ${REPO_NAME}"
echo ""

gh repo create "$REPO_NAME" \
    --public \
    --description "Homebrew tap for Agenticide - AI-powered development CLI" \
    --homepage "https://github.com/ivikasavnish/agenticide" \
    || echo "Repository may already exist"

# Clone or use existing directory
if [ -d "$REPO_NAME" ]; then
    echo "📁 Directory $REPO_NAME already exists, using it..."
    cd "$REPO_NAME"
else
    echo "📥 Cloning repository..."
    gh repo clone "ivikasavnish/$REPO_NAME"
    cd "$REPO_NAME"
fi

# Create Formula directory
mkdir -p Formula

# Copy formula
echo "📝 Copying formula..."
cp ../Formula/agenticide.rb Formula/

# Create README
cat > README.md << 'EOF'
# Homebrew Agenticide

Homebrew tap for [Agenticide](https://github.com/ivikasavnish/agenticide) - AI-powered development CLI with API testing, SQL queries, and intelligent hints.

## Installation

```bash
brew tap ivikasavnish/agenticide
brew install agenticide
```

## Quick Start

```bash
agenticide              # Start interactive chat
agenticide --help       # See all commands
```

## Features

- 🌐 **API Testing** - Test REST APIs (`/api get <url>`)
- 🗄️ **SQL Queries** - Query databases (`/sql connect sqlite ./db.db`)
- 💡 **Smart Hints** - Context-aware autocomplete
- 🚀 **Code Generation** - Generate code stubs (`/stub`)
- 🖥️ **Process Management** - Manage background processes (`/process`)

## Documentation

Visit the [main repository](https://github.com/ivikasavnish/agenticide) for complete documentation.

## Version

Current version: 3.1.0

## License

MIT
EOF

# Commit and push
echo ""
echo "💾 Committing changes..."
git add .
git commit -m "Add Agenticide v3.1.0 formula" || echo "No changes to commit"

echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main || git push -u origin master

echo ""
echo "✅ Tap repository created successfully!"
echo ""
echo "🍺 Users can now install with:"
echo "   brew tap ivikasavnish/agenticide"
echo "   brew install agenticide"
echo ""
echo "🔗 Repository: https://github.com/ivikasavnish/homebrew-agenticide"
