# /beads (repo issue tracker)

Drive Beads (`bd`) commands for task tracking.

## Usage (Terminal, macOS)
```bash
# Ensure bd is on PATH (first time)
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc && source ~/.zshrc

# Ready work and lists
bd ready
bd list

# Create / update
bd create "Title" -t task -p 2
bd update <issue-id> --status in_progress

# Dependencies and sync
bd dep add <child-id> <parent-id> --type blocks
bd sync

# Health check
bd doctor
```

Tips:
- Run in repo root.
- Data lives in `.beads/` and is tracked; commit along with code.
- If `bd` is missing, rerun the installer: `curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash`.




