# Pi Agent Configuration

This repository documents and tracks my portable [Pi](https://pi.dev/) coding-agent configuration. It is intended to make a new-machine restore straightforward while keeping credentials, sessions, generated indexes, and package caches out of git.

The live installation reviewed on 2026-07-02 is Pi `0.80.3` with CodeGraph `0.9.4`, OpenSpec `1.4.1`, global `context-mode` `1.0.162`, and Pi-package `context-mode` `1.0.169`.

## What is tracked

- `.pi/agent/settings.json`
- `.pi/agent/models.json`
- `.pi/agent/AGENTS.md`
- `.pi/agent/extensions/`
- `.local/bin/pi-codegraph-hooks` for optional repository-local CodeGraph Git hooks
- `.agents/skills/` for portable custom skills that are intentionally vendored here
- This recovery documentation

## What is intentionally not tracked

- `.pi/agent/auth.json` — credentials and OAuth tokens
- `.pi/agent/sessions/` — conversation history and potentially sensitive project context
- `.pi/agent/run-history.jsonl`
- `.pi/agent/update-cache.json`
- `.pi/agent/npm/` — installed Pi packages and npm cache state
- `node_modules/` and other generated caches
- `.codegraph/` — generated CodeGraph indexes
- `.agents/skills/superpowers/` — cloned from upstream
- `.codex/skills/` — Codex-managed skills
- OpenSpec-generated Pi skills/prompts from the separate `pi-extensions` checkout
- Context Mode databases, caches, and generated runtime state

## New-machine restore checklist

### 1. Install prerequisites

Install Node.js/npm first. This machine currently uses fnm-managed Node `v22.22.3`.

Install Pi:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi --version
```

Install yadm:

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install yadm

# Fedora
sudo dnf install yadm

# Arch Linux
sudo pacman -S yadm

# macOS
brew install yadm
```

On Windows, use Git Bash or WSL. For Git Bash without a package manager:

```bash
mkdir -p ~/.local/bin
curl -L --fail -o ~/.local/bin/yadm https://github.com/yadm-dev/yadm/raw/master/yadm
chmod +x ~/.local/bin/yadm
yadm --version
```

### 2. Restore this configuration

```bash
yadm clone git@github.com:dobleuber/pi-agent.git
# If already cloned:
yadm pull
```

Then authenticate providers again:

```text
pi
/login
```

API-key based providers in `.pi/agent/models.json` expect environment variables such as:

```bash
export ZAI_API_KEY=...
export STRATUS_API_KEY=...
```

The local llama.cpp provider expects an OpenAI-compatible server at `http://127.0.0.1:11434/v1`.

### 3. Install/update Pi packages

The current live Pi package set is:

```json
[
  "npm:pi-updater",
  "npm:pi-subagents",
  "npm:pi-interactive-shell",
  { "source": "npm:@plannotator/pi-extension", "skills": [] },
  "npm:context-mode",
  "npm:pi-intercom",
  "npm:pi-prompt-template-model",
  "npm:@spences10/pi-observability",
  "npm:pi-web-access"
]
```

After restoring settings, install or reconcile packages:

```bash
pi update --extensions
pi list
```

Expected package-provided skills include:

```text
pi-subagents
pi-interactive-shell
pi-intercom
prompt-template-authoring
librarian
context-mode
ctx-doctor
ctx-index
ctx-insight
ctx-purge
ctx-search
ctx-stats
ctx-upgrade
```

### 4. Restore external skill sources

Pi loads skills from default locations plus the extra paths in `.pi/agent/settings.json`.

Tracked portable skills in this repo currently include:

```text
codegraph-cli
codegraph-first-exploration
code-reviewer
docs-writer
godot-cli
openscad-cli
pr-creator
skill-creator
skill-installer
```

Additional local custom skills detected on the live machine but not vendored here:

```text
llama-cpp-models
midscenejs
plannotator-compound
plannotator-setup-goal
plannotator-visual-explainer
pr-description-writer
sudo-with-user-approval
```

If those should be recoverable from this repo, add and commit them explicitly. Otherwise reinstall them from their upstream/source locations on a new machine.

Codex-managed skills currently loaded from `~/.codex/skills`:

```text
plannotator-annotate
plannotator-last
plannotator-review
```

Superpowers is intentionally installed from upstream instead of vendored:

```bash
git clone https://github.com/obra/superpowers.git ~/.agents/skills/superpowers
# update later
git -C ~/.agents/skills/superpowers pull
```

### 5. Restore OpenSpec integration

OpenSpec is currently managed from the separate checkout:

```text
/home/dobleuber/Projects/personal/pi-extensions/.pi/skills
/home/dobleuber/Projects/personal/pi-extensions/.pi/prompts
```

Install OpenSpec:

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

Current version observed: `1.4.1`.

Configure the custom expanded workflow:

```bash
openspec config profile
```

Choose:

```text
profile: custom
delivery: both
workflows:
  explore
  new
  continue
  apply
  ff
  sync
  archive
  bulk-archive
  verify
  onboard
```

Then initialize/update the Pi integration from the `pi-extensions` repository rather than this repo:

```bash
cd /home/dobleuber/Projects/personal/pi-extensions
openspec init --tools pi --profile custom --force
# Later, after upgrading OpenSpec:
openspec update --force
```

Expected OpenSpec skills include `openspec-apply-change`, `openspec-archive-change`, `openspec-bulk-archive-change`, `openspec-continue-change`, `openspec-explore`, `openspec-ff-change`, `openspec-new-change`, `openspec-onboard`, `openspec-sync-specs`, and `openspec-verify-change`.

### 6. Install CodeGraph

Pi uses CodeGraph through the global CLI, not MCP.

```bash
npm install -g @colbymchenry/codegraph@latest
codegraph --version
```

Expected Pi workflow in code repositories:

- Before broad code exploration, use the `codegraph-first-exploration` guardrail skill when available.
- If `.codegraph/` is missing in a clear code repository and the task needs significant exploration, initialize it:

  ```bash
  codegraph init -i
  ```

- When `.codegraph/` exists, prefer CodeGraph before broad grep/read exploration:

  ```bash
  codegraph context "<task>"
  codegraph query "<symbol>"
  codegraph callers "<symbol>"
  codegraph callees "<symbol>"
  codegraph impact "<symbol>"
  ```

- Sync stale indexes before relying on them:

  ```bash
  codegraph sync
  ```

Optional repository-local hooks:

```bash
# inside a target repo
pi-codegraph-hooks install
pi-codegraph-hooks install --pre-commit
pi-codegraph-hooks remove
```

### 7. Install Context Mode

Context Mode is already part of the current Pi package set. It complements CodeGraph rather than replacing it: CodeGraph is first for code architecture/symbol/call-flow/impact questions; Context Mode is for large outputs, logs, fetched content, generated analysis, and avoiding raw dumps into model context.

Install or update both the global CLI and Pi package:

```bash
npm install -g context-mode
pi install npm:context-mode   # no-op if already present
pi update --extension npm:context-mode
```

Verify outside Pi:

```bash
npm list -g context-mode --depth=0
pi list | grep context-mode
```

Verify inside Pi with one of the registered tools/skills:

```text
/skill:ctx-stats
```

or ask Pi to run `ctx_stats`.

Routing hierarchy:

- Use CodeGraph first for repository architecture, symbols, call flow, and impact analysis.
- Use Context Mode `ctx_*` tools for large/noisy outputs, logs, web/fetched content, generated analysis, and session-continuity queries.
- Use Pi's direct `read` tool for exact source-file inspection.
- Use Pi's `edit`/`write` tools for precise changes.

### 8. Optional token/secret workflows

RTK is optional:

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
rtk init -g
rtk --version
rtk gain
```

Varlock is optional:

```bash
npx varlock init --agent
# or
brew install dmno-dev/tap/varlock
```

Use `.env.schema` for agent-readable config context and keep real secrets in ignored local files.

## Verification after restore

Run these checks after a fresh setup:

```bash
pi --version
pi list
codegraph --version
openspec --version
npm list -g context-mode --depth=0
yadm status
```

Inside Pi:

```text
/reload
/skill:using-superpowers
/skill:ctx-stats
```

The startup header should list skills from tracked `.agents/skills`, package skills, `~/.codex/skills`, and the configured OpenSpec skill path.

## Daily maintenance

Check yadm-managed changes from anywhere:

```bash
yadm status
```

Before committing recovery changes, review sensitive files carefully:

```bash
yadm diff
```

Commit portable configuration only:

```bash
yadm add \
  .pi/agent/settings.json \
  .pi/agent/models.json \
  .pi/agent/AGENTS.md \
  .pi/agent/extensions \
  .local/bin/pi-codegraph-hooks \
  .agents/skills \
  README.md

yadm commit -m "Update pi agent recovery docs"
yadm push
```

Do not commit credentials, sessions, package caches, generated CodeGraph indexes, Context Mode databases, or machine-specific secret state.
