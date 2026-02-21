# 🍺 Homebrew Installation Guide

## Quick Install

### Install via Homebrew Tap

```bash
# Add the tap
brew tap ivikasavnish/agenticide

# Install
brew install agenticide

# Start using
agenticide --version
agenticide
```

---

## Alternative: Install from Release

If the tap isn't set up yet, you can install from a release:

```bash
# Download the latest release for your platform
# macOS ARM64 (M1/M2/M3)
curl -L https://github.com/ivikasavnish/agenticide/releases/download/v3.1.0/agenticide-darwin-arm64.tar.gz -o agenticide.tar.gz

# macOS x64 (Intel)
curl -L https://github.com/ivikasavnish/agenticide/releases/download/v3.1.0/agenticide-darwin-x64.tar.gz -o agenticide.tar.gz

# Extract and install
tar -xzf agenticide.tar.gz
cd agenticide-darwin-*
chmod +x agenticide
sudo mv agenticide /usr/local/bin/

# Test
agenticide --version
```

---

## For Maintainers: Setting Up Homebrew Tap

### 1. Create Tap Repository

```bash
# Create a new repo: homebrew-agenticide
# On GitHub: https://github.com/ivikasavnish/homebrew-agenticide

# Clone it
git clone https://github.com/ivikasavnish/homebrew-agenticide.git
cd homebrew-agenticide

# Copy formula
cp /path/to/agenticide/Formula/agenticide.rb Formula/agenticide.rb

# Commit and push
git add Formula/agenticide.rb
git commit -m "Add Agenticide formula v3.1.0"
git push
```

### 2. Create GitHub Release

```bash
# From the main agenticide repo
cd /Users/vikasavnish/agenticide

# Create release package
./create-release.sh

# This creates:
# - release-v3.1.0/agenticide-darwin-arm64.tar.gz
# - release-v3.1.0/agenticide-darwin-arm64.sha256

# Go to GitHub and create a new release:
# https://github.com/ivikasavnish/agenticide/releases/new

# Tag: v3.1.0
# Title: Agenticide v3.1.0
# Upload all platform tarballs
```

### 3. Update Formula with SHA256

After uploading releases, get the SHA256:

```bash
shasum -a 256 release-v3.1.0/agenticide-darwin-arm64.tar.gz
```

Update `Formula/agenticide.rb` with the actual SHA256 values.

### 4. Test the Formula

```bash
# Test install locally
brew install --build-from-source Formula/agenticide.rb

# Test from tap
brew tap ivikasavnish/agenticide
brew install agenticide
```

---

## Homebrew Formula Structure

The repository structure should be:

```
homebrew-agenticide/
├── Formula/
│   └── agenticide.rb
└── README.md
```

---

## Users Can Then Install With

```bash
# One-time tap
brew tap ivikasavnish/agenticide

# Install
brew install agenticide

# Update
brew upgrade agenticide

# Uninstall
brew uninstall agenticide
```

---

## Release Checklist

When releasing a new version:

- [ ] Build for all platforms (macOS ARM64, macOS x64, Linux ARM64, Linux x64)
- [ ] Create tarballs with `create-release.sh`
- [ ] Create GitHub release with tag `vX.Y.Z`
- [ ] Upload all platform tarballs
- [ ] Get SHA256 for each tarball
- [ ] Update Formula/agenticide.rb with new version and SHA256s
- [ ] Push formula to homebrew-agenticide repo
- [ ] Test: `brew upgrade agenticide`
- [ ] Announce release

---

## Supported Platforms

| Platform | Architecture | Support |
|----------|-------------|---------|
| macOS | ARM64 (M1/M2/M3) | ✅ |
| macOS | x64 (Intel) | ✅ |
| Linux | ARM64 | ✅ |
| Linux | x64 | ✅ |

---

## Building Multi-Platform

### On macOS ARM64:
```bash
./create-release.sh
# Creates: agenticide-darwin-arm64.tar.gz
```

### On macOS Intel:
```bash
./create-release.sh
# Creates: agenticide-darwin-x64.tar.gz
```

### On Linux (use Docker or CI):
```bash
# Docker example
docker run --rm -v $(pwd):/workspace -w /workspace oven/bun:latest bash -c "
  apt-get update && apt-get install -y git
  git config --global --add safe.directory /workspace
  ./create-release.sh
"
```

---

## Formula Testing

```bash
# Audit formula
brew audit --strict Formula/agenticide.rb

# Test installation
brew install --build-from-source Formula/agenticide.rb

# Run formula tests
brew test agenticide

# Check formula info
brew info agenticide
```

---

## Post-Install

After `brew install agenticide`, users can:

```bash
# Check installation
agenticide --version

# See help
agenticide --help

# Start using
agenticide

# Try features
agenticide
You: /help
You: /api get https://api.github.com/zen
```

---

## Troubleshooting

### Formula Not Found
```bash
# Make sure tap is added
brew tap ivikasavnish/agenticide

# Update brew
brew update
```

### Installation Fails
```bash
# Check formula
brew audit agenticide

# Try verbose install
brew install --verbose agenticide
```

### Binary Won't Run
```bash
# Check if installed
which agenticide

# Test directly
/usr/local/bin/agenticide --version

# Check permissions
ls -la /usr/local/bin/agenticide
```

---

## Benefits of Homebrew

✅ **Easy Installation**: One command to install  
✅ **Automatic Updates**: `brew upgrade` keeps it current  
✅ **Dependency Management**: Homebrew handles everything  
✅ **Uninstall**: Clean removal with `brew uninstall`  
✅ **Multi-Platform**: Works on macOS and Linux  
✅ **Version Management**: Easy to switch versions  
✅ **Trusted Source**: Users trust Homebrew  

---

## Quick Reference

```bash
# Install
brew install agenticide

# Update
brew upgrade agenticide

# Uninstall
brew uninstall agenticide

# Info
brew info agenticide

# List versions
brew list --versions agenticide
```

---

**Ready to make Agenticide available via Homebrew!** 🍺
