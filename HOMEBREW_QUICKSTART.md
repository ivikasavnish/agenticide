# 🚀 Quick Start: Enable Homebrew Installation

## 5-Minute Setup

### Step 1: Create Tap Repository (1 min)

Go to GitHub and create a new repository:
- Name: `homebrew-agenticide`
- Public
- Initialize with README

**URL:** `https://github.com/ivikasavnish/homebrew-agenticide`

### Step 2: Push Formula (1 min)

```bash
# Clone the tap repo
git clone https://github.com/ivikasavnish/homebrew-agenticide.git
cd homebrew-agenticide

# Create Formula directory
mkdir Formula

# Copy formula
cp /Users/vikasavnish/agenticide/Formula/agenticide.rb Formula/

# Commit and push
git add .
git commit -m "Add Agenticide v3.1.0 formula"
git push
```

### Step 3: Create GitHub Release (2 min)

1. Go to: https://github.com/ivikasavnish/agenticide/releases/new

2. Fill in:
   - **Tag:** `v3.1.0`
   - **Title:** `Agenticide v3.1.0`
   - **Description:**
     ```markdown
     # Agenticide v3.1.0
     
     AI-powered development CLI with API testing, SQL queries, and intelligent hints.
     
     ## Installation
     
     ### Homebrew (macOS/Linux)
     ```bash
     brew tap ivikasavnish/agenticide
     brew install agenticide
     ```
     
     ### Direct Download
     Download the appropriate package for your platform below.
     
     ## What's New
     - 🌐 API Runner Extension
     - 🗄️ SQL Runner Extension
     - 💡 Intelligent Hint System
     
     See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for details.
     
     ## SHA256 Checksums
     - `agenticide-darwin-arm64.tar.gz`: `25096b2ce939740883ecb38ef5fa1380348389126ed59210f4d470bfca4ebc45`
     ```

3. **Upload file:**
   - Drag and drop: `release-v3.1.0/agenticide-darwin-arm64.tar.gz`

4. Click **Publish release**

### Step 4: Test Installation (1 min)

```bash
# Add tap
brew tap ivikasavnish/agenticide

# Install
brew install agenticide

# Test
agenticide --version   # Should show: 3.1.0
agenticide --help      # Should show help
agenticide             # Start it!
```

---

## ✅ Done!

Users can now install with:

```bash
brew tap ivikasavnish/agenticide
brew install agenticide
```

---

## 🔄 Future Updates

When releasing a new version:

```bash
# 1. Update version in code
# Edit agenticide-cli/package.json

# 2. Create new release
./create-release.sh

# 3. Update formula
# Edit Formula/agenticide.rb with new version and SHA256

# 4. Push to tap repo
cd homebrew-agenticide
git add Formula/agenticide.rb
git commit -m "Update to v3.2.0"
git push

# 5. Create GitHub release
# Upload new tarball

# Users update with:
brew upgrade agenticide
```

---

## 📦 Multi-Platform (Optional)

To support all platforms, build on each:

**macOS Intel:**
```bash
./create-release.sh  # Creates agenticide-darwin-x64.tar.gz
```

**Linux:**
```bash
# On Linux machine or via Docker
./create-release.sh  # Creates agenticide-linux-x64.tar.gz
```

Then:
1. Upload all tarballs to GitHub release
2. Update `Formula/agenticide.rb` with all SHA256s
3. Users on any platform can `brew install`!

---

## 📖 Documentation

- **HOMEBREW_SETUP.md** - Complete setup guide
- **HOMEBREW_GUIDE.md** - Technical details
- **RELEASE_NOTES.md** - Release information
- **INSTALL_GUIDE.md** - User installation guide

---

## 🎯 What You Have

```
agenticide/
├── Formula/
│   └── agenticide.rb              ← Homebrew formula ✅
├── release-v3.1.0/
│   └── agenticide-darwin-arm64.tar.gz  ← Release package ✅
├── create-release.sh              ← Automation script ✅
├── HOMEBREW_SETUP.md             ← Setup guide ✅
├── HOMEBREW_GUIDE.md             ← Technical guide ✅
└── HOMEBREW_QUICKSTART.md        ← This file ✅
```

---

## 🎉 Benefits

**For Users:**
- ✅ One command to install
- ✅ Automatic updates
- ✅ Trusted source
- ✅ Clean uninstall

**For You:**
- ✅ Professional distribution
- ✅ Wider reach
- ✅ Easy updates
- ✅ Community trust

---

## 🚀 Go Live Now!

Just follow the 5-minute setup above, and Agenticide will be installable via Homebrew!

```bash
brew tap ivikasavnish/agenticide
brew install agenticide
```

**That's it!** 🍺
