#!/bin/bash
# Build standalone Agenticide binary with Bun
# No source code required for distribution!

set -e

echo "🏗️  Building Agenticide binary..."
echo ""

cd "$(dirname "$0")"

# Build for current platform
echo "📦 Compiling for $(uname -s) $(uname -m)..."
bun build --compile --minify \
  --target=bun \
  --outfile=agenticide-bin \
  agenticide-cli/index.js

echo ""
echo "✅ Binary created: agenticide-bin"
echo "📊 Size: $(ls -lh agenticide-bin | awk '{print $5}')"
echo ""
echo "🧪 Test it:"
echo "  ./agenticide-bin --version"
echo "  ./agenticide-bin --help"
echo ""
echo "📦 Install it:"
echo "  sudo mv agenticide-bin /usr/local/bin/agenticide"
echo "  chmod +x /usr/local/bin/agenticide"
echo ""
echo "💡 The binary is standalone - no Node.js, Bun, or source code needed!"
echo "   Just distribute the agenticide-bin file (56MB)"
