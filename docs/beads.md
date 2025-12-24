# Beads usage (project tracker)

This repo is initialized with Beads (`bd`). The CLI binary is installed to `$HOME/.local/bin/bd` via the official installer.

## One-time setup (macOS, zsh)
- Add bd to PATH:
  - `echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.zshrc`
  - `source ~/.zshrc` (or open a new shell)
- Verify: `bd --version` (expect `0.29.0` or newer)

## Daily flow (run in repo root)
- View ready work: `bd ready`
- List issues: `bd list`
- Create: `bd create "Title" -t task -p 2`
- Show details: `bd show <issue-id>`
- Update status: `bd update <issue-id> --status in_progress`
- Add dependency: `bd dep add <child-id> <parent-id> --type blocks`
- Sync before/after git operations: `bd sync`
- Health check: `bd doctor`

## Repo notes
- Beads data lives in `.beads/` and is tracked by git (see `.gitattributes`).
- If `bd` is ever missing, rerun the installer: `curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash` and re-add PATH.
- `@beads/bd` is listed as a devDependency; use `bd` from your PATH for reliability.




