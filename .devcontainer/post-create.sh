#!/bin/bash
# Post-create script for DevContainer setup

set -e

echo "🚀 Setting up Agenticide development environment..."

# Install CLI dependencies
echo "📦 Installing agenticide-cli dependencies..."
cd /workspace/agenticide-cli
npm install

# Install Core dependencies
echo "📦 Installing agenticide-core dependencies..."
cd /workspace/agenticide-core
npm install

# Install VSCode extension dependencies
echo "📦 Installing agenticide-vscode dependencies..."
cd /workspace/agenticide-vscode
npm install

# Setup git config
echo "🔧 Configuring git..."
git config --global core.autocrlf input
git config --global init.defaultBranch main

# Create agenticide config directory
echo "📁 Creating config directory..."
mkdir -p ~/.agenticide/sessions
mkdir -p ~/.agenticide/attachments

# Create default config
if [ ! -f ~/.agenticide/config.json ]; then
    echo "⚙️  Creating default config..."
    cat > ~/.agenticide/config.json << 'EOF'
{
  "defaultProvider": "copilot",
  "useACP": true,
  "claudeApiKey": "",
  "mcpServers": [],
  "version": "3.1.1",
  "extensions_enabled": true,
  "auto_hint": true
}
EOF
fi

# Link CLI for global usage
echo "🔗 Linking CLI globally..."
cd /workspace/agenticide-cli
npm link

# Build TypeScript extension
echo "🔨 Building VSCode extension..."
cd /workspace/agenticide-vscode
npm run compile

# Run tests to verify setup
echo "🧪 Running tests..."
cd /workspace
node test-context-attachment.js

echo "✅ DevContainer setup complete!"
echo ""
echo "📝 Quick start:"
echo "  agenticide --help"
echo "  agenticide chat"
echo "  cd agenticide-vscode && npm run watch"
echo ""
echo "🧪 Testing:"
echo "  node test-context-attachment.js"
echo "  cd agenticide-cli && npm test"
echo ""
echo "📖 Documentation:"
echo "  docs/CONTEXT_ATTACHMENTS.md"
echo "  docs/CONTEXT_ATTACHMENTS_QUICKSTART.md"
