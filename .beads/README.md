# Beads - AI-Native Issue Tracking

Welcome to Beads! This repository uses **Beads** for issue tracking - a modern, AI-native tool designed to live directly in your codebase alongside your code.

## What is Beads?

Beads is issue tracking that lives in your repo, making it perfect for AI coding agents and developers who want their issues close to their code. No web UI required - everything works through the CLI and integrates seamlessly with git.

**Learn more:** [github.com/steveyegge/beads](https://github.com/steveyegge/beads)

## Quick Start

### Essential Commands

```bash
# Create new issues
bd create "Add user authentication"

# View all issues
bd list

# View issue details
bd show <issue-id>

# Update issue status
bd update <issue-id> --status in_progress
bd update <issue-id> --status done

# Sync with git remote
bd sync
```

### Working with Issues

Issues in Beads are:
- **Git-native**: Stored in `.beads/issues.jsonl` and synced like code
- **AI-friendly**: CLI-first design works perfectly with AI coding agents
- **Branch-aware**: Issues can follow your branch workflow
- **Always in sync**: Auto-syncs with your commits

## Why Beads?

✨ **AI-Native Design**
- Built specifically for AI-assisted development workflows
- CLI-first interface works seamlessly with AI coding agents
- No context switching to web UIs

🚀 **Developer Focused**
- Issues live in your repo, right next to your code
- Works offline, syncs when you push
- Fast, lightweight, and stays out of your way

🔧 **Git Integration**
- Automatic sync with git commits
- Branch-aware issue tracking
- Intelligent JSONL merge resolution

## Get Started with Beads

Try Beads in your own projects:

### Installation

#### Option 1: Safe Installation (Recommended)

**Install script checksum (SHA-256):**
```
6b78ebe68970e8f7c3a627905d79df75feaf2599688ef09830c91af4d26cb415
```

**Safe installation steps:**

```bash
# 1. Download the install script
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh -o install-beads.sh

# 2. Verify the checksum
echo "6b78ebe68970e8f7c3a627905d79df75feaf2599688ef09830c91af4d26cb415  install-beads.sh" | shasum -a 256 -c

# 3. Inspect the script (review what it will do)
cat install-beads.sh

# 4. Run the installation locally
bash install-beads.sh

# 5. Clean up
rm install-beads.sh
```

**Note:** Always verify the checksum matches before running the script. If verification fails, do not proceed with installation.

#### Option 2: Package Manager Installation

**Homebrew (macOS/Linux):**
```bash
brew install beads
```

**Other package managers:**
Check the [official Beads documentation](https://github.com/steveyegge/beads) for package manager availability in your distribution.

#### Option 3: Manual Installation

1. Download the latest release from [github.com/steveyegge/beads/releases](https://github.com/steveyegge/beads/releases)
2. Extract and add to your `PATH`
3. Verify installation: `bd --version`

### Initialize Beads

```bash
# Initialize in your repo
bd init

# Create your first issue
bd create "Try out Beads"
```

**⚠️ Security Note:** The direct pipe-to-bash pattern (`curl | bash`) is convenient but not recommended for production use. Always verify checksums and inspect scripts before execution.

## Learn More

- **Documentation**: [github.com/steveyegge/beads/docs](https://github.com/steveyegge/beads/tree/main/docs)
- **Quick Start Guide**: Run `bd quickstart`
- **Examples**: [github.com/steveyegge/beads/examples](https://github.com/steveyegge/beads/tree/main/examples)

---

*Beads: Issue tracking that moves at the speed of thought* ⚡
