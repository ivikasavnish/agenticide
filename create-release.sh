#!/bin/bash

# Release Script for Agenticide
# Creates platform-specific builds and prepares GitHub release

set -e

VERSION="3.1.0"
RELEASE_DIR="release-v${VERSION}"

echo "🚀 Creating Agenticide v${VERSION} Release"
echo ""

# Create release directory
mkdir -p "$RELEASE_DIR"

# Check if we have bun
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is required to build"
    echo "   Install: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Current platform
CURRENT_OS=$(uname -s | tr '[:upper:]' '[:lower:]')
CURRENT_ARCH=$(uname -m)

if [ "$CURRENT_ARCH" = "x86_64" ]; then
    CURRENT_ARCH="x64"
elif [ "$CURRENT_ARCH" = "aarch64" ]; then
    CURRENT_ARCH="arm64"
fi

echo "📦 Building for current platform: $CURRENT_OS-$CURRENT_ARCH"

# Build for current platform
cd agenticide-cli
bun build --compile --minify \
  --target=bun \
  --outfile="../${RELEASE_DIR}/agenticide" \
  ./index.js

cd ..

# Package for current platform
PLATFORM_NAME="agenticide-${CURRENT_OS}-${CURRENT_ARCH}"
PACKAGE_DIR="${RELEASE_DIR}/${PLATFORM_NAME}"
mkdir -p "$PACKAGE_DIR"

# Copy files
cp "${RELEASE_DIR}/agenticide" "${PACKAGE_DIR}/"
cp RELEASE_NOTES.md "${PACKAGE_DIR}/" 2>/dev/null || true
cp INSTALL_GUIDE.md "${PACKAGE_DIR}/" 2>/dev/null || true
mkdir -p "${PACKAGE_DIR}/docs"
cp -r docs/*.md "${PACKAGE_DIR}/docs/" 2>/dev/null || true

# Create README for package
cat > "${PACKAGE_DIR}/README.md" << 'EOF'
# Agenticide v3.1.0

## Installation

### Quick Install
```bash
# Make executable
chmod +x agenticide

# Move to PATH
sudo mv agenticide /usr/local/bin/

# Or install to user directory
mv agenticide ~/.local/bin/
```

### Test Installation
```bash
agenticide --version
agenticide --help
```

## Quick Start
```bash
agenticide
```

## Documentation
See `docs/` folder for complete documentation.

## Features
- 🌐 API Testing
- 🗄️ SQL Queries
- 💡 Smart Hints
- 🚀 Code Generation
- 🖥️ Process Management
- And more!

Visit: https://github.com/ivikasavnish/agenticide
EOF

# Create tarball
echo "📦 Creating tarball: ${PLATFORM_NAME}.tar.gz"
cd "$RELEASE_DIR"
tar -czf "${PLATFORM_NAME}.tar.gz" "$PLATFORM_NAME"
cd ..

# Calculate SHA256
echo ""
echo "🔐 Calculating SHA256..."
if command -v shasum &> /dev/null; then
    SHA256=$(shasum -a 256 "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | awk '{print $1}')
else
    SHA256=$(sha256sum "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | awk '{print $1}')
fi

echo ""
echo "✅ Release Package Created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Package: ${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz"
echo "📊 Size: $(du -h "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | cut -f1)"
echo "🔐 SHA256: $SHA256"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save SHA256 to file
echo "$SHA256" > "${RELEASE_DIR}/${PLATFORM_NAME}.sha256"

# Create release notes
cat > "${RELEASE_DIR}/RELEASE_INFO.txt" << EOF
Agenticide v${VERSION}
Platform: ${CURRENT_OS}-${CURRENT_ARCH}

Package: ${PLATFORM_NAME}.tar.gz
SHA256: $SHA256

Installation:
  tar -xzf ${PLATFORM_NAME}.tar.gz
  cd ${PLATFORM_NAME}
  chmod +x agenticide
  sudo mv agenticide /usr/local/bin/

Quick Test:
  agenticide --version
  agenticide --help

Documentation:
  See docs/ folder or visit:
  https://github.com/ivikasavnish/agenticide
EOF

echo "📋 Next Steps:"
echo ""
echo "1. Test the release:"
echo "   cd ${RELEASE_DIR}/${PLATFORM_NAME}"
echo "   ./agenticide --version"
echo ""
echo "2. Create GitHub Release:"
echo "   - Go to: https://github.com/ivikasavnish/agenticide/releases/new"
echo "   - Tag: v${VERSION}"
echo "   - Upload: ${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz"
echo "   - Add SHA256: $SHA256"
echo ""
echo "3. Update Homebrew Formula:"
echo "   - Edit Formula/agenticide.rb"
echo "   - Replace SHA256 for ${CURRENT_OS}-${CURRENT_ARCH}"
echo "   - Update download URL"
echo ""
echo "4. For multi-platform:"
echo "   - Build on Linux: ./create-release.sh"
echo "   - Build on macOS x64: ./create-release.sh"
echo "   - Upload all packages to GitHub release"
echo ""
echo "🎉 Release ready!"
