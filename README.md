# Pi Agent Configuration

This repository is managed with [yadm](https://yadm.io/) and tracks my portable Pi coding-agent configuration in place, without duplicating files.

## What is tracked

- `.pi/agent/settings.json`
- `.pi/agent/models.json`
- `.pi/agent/extensions/`
- Local/custom skills used by Pi:
  - `.codex/skills/code-reviewer/`
  - `.codex/skills/docs-writer/`
  - `.codex/skills/openscad/`
  - `.codex/skills/playwright-cli/`
  - `.codex/skills/pr-creator/`
  - `.agents/skills/code-reviewer/`
  - `.agents/skills/docs-writer/`
  - `.agents/skills/godot-cli/`
  - `.agents/skills/openscad-cli/`
  - `.agents/skills/pr-creator/`
- Optional Pi resources if added later: `keybindings.json`, `AGENTS.md`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `prompts/`, `themes/`

## What is intentionally not tracked

- `.pi/agent/auth.json` — credentials and OAuth tokens
- `.pi/agent/sessions/` — conversation history and potentially sensitive project context
- `.pi/agent/run-history.jsonl`
- `.pi/agent/update-cache.json`
- `node_modules/` and other generated caches

## Install yadm

### Windows

Use Git Bash or another Bash-compatible shell. Install yadm into `~/.local/bin`:

```bash
mkdir -p ~/.local/bin
curl -L --fail -o ~/.local/bin/yadm https://github.com/yadm-dev/yadm/raw/master/yadm
chmod +x ~/.local/bin/yadm
yadm --version
```

Make sure `~/.local/bin` is on your `PATH`.

If you use WSL, install yadm from your Linux distribution instead, for example:

```bash
sudo apt update
sudo apt install yadm
```

### Linux

Debian/Ubuntu:

```bash
sudo apt update
sudo apt install yadm
```

Fedora:

```bash
sudo dnf install yadm
```

Arch Linux:

```bash
sudo pacman -S yadm
```

### macOS

Using Homebrew:

```bash
brew install yadm
```

## Restore on a new machine

Install yadm, then clone this repo into your home directory:

```bash
yadm clone git@github.com:dobleuber/pi-agent.git
```

Then authenticate providers again:

```bash
pi
/login
```

## Install the currently used skills

Pi loads skills from these paths in this setup:

```json
{
  "skills": [
    "~/.codex/skills",
    "~/.pi/skills",
    "-C:/Users/wbert/.agents/skills/playwright-cli"
  ]
}
```

Pi also discovers `~/.agents/skills/` by default. The explicit exclusion prevents loading the duplicate `~/.agents/skills/playwright-cli`; this setup uses the `~/.codex/skills/playwright-cli` copy.

### 1. OpenSpec

Source: <https://openspec.dev/> / <https://github.com/Fission-AI/OpenSpec>

Currently installed CLI version on this machine:

```bash
openspec --version
# 1.2.0
```

Install OpenSpec:

```bash
npm install -g @fission-ai/openspec@latest
# For an exact match with this machine instead:
# npm install -g @fission-ai/openspec@1.2.0
```

This setup uses OpenSpec's **custom expanded workflow** with Pi tool output. Configure OpenSpec like this:

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

Then generate the Pi skills and prompts from your home directory:

```bash
cd ~
openspec init --tools pi --profile custom --force
# Later, after upgrading OpenSpec:
openspec update --force
```

Expected generated files:

```text
~/.pi/skills/openspec-apply-change/SKILL.md
~/.pi/skills/openspec-archive-change/SKILL.md
~/.pi/skills/openspec-bulk-archive-change/SKILL.md
~/.pi/skills/openspec-continue-change/SKILL.md
~/.pi/skills/openspec-explore/SKILL.md
~/.pi/skills/openspec-ff-change/SKILL.md
~/.pi/skills/openspec-new-change/SKILL.md
~/.pi/skills/openspec-onboard/SKILL.md
~/.pi/skills/openspec-sync-specs/SKILL.md
~/.pi/skills/openspec-verify-change/SKILL.md
~/.pi/prompts/opsx-apply.md
~/.pi/prompts/opsx-archive.md
~/.pi/prompts/opsx-bulk-archive.md
~/.pi/prompts/opsx-continue.md
~/.pi/prompts/opsx-explore.md
~/.pi/prompts/opsx-ff.md
~/.pi/prompts/opsx-new.md
~/.pi/prompts/opsx-onboard.md
~/.pi/prompts/opsx-sync.md
~/.pi/prompts/opsx-verify.md
```

Verify:

```bash
openspec config list
find ~/.pi/skills -name SKILL.md | sort
find ~/.pi/prompts -name 'opsx-*.md' | sort
```

### 2. Superpowers

Source: <https://github.com/obra/superpowers>

This setup exposes Superpowers to Pi by installing the repo at `~/.codex/superpowers` and linking it into Pi's default skill discovery path at `~/.agents/skills/superpowers`.

Install:

```bash
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers ~/.agents/skills/superpowers
```

On Windows Git Bash, if symlink creation is not enabled, copy the directory instead:

```bash
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
cp -R ~/.codex/superpowers ~/.agents/skills/superpowers
```

Expected skills:

```text
brainstorming
dispatching-parallel-agents
executing-plans
finishing-a-development-branch
receiving-code-review
requesting-code-review
subagent-driven-development
systematic-debugging
test-driven-development
using-git-worktrees
using-superpowers
verification-before-completion
writing-plans
writing-skills
```

Verify:

```bash
find -L ~/.agents/skills/superpowers/skills -name SKILL.md | sort
```

### 3. Local/custom skills tracked by this yadm repo

These skills are part of this machine's setup and are now tracked directly by yadm in their real locations, not copied into a separate folder.

Loaded from `~/.codex/skills/`:

```text
code-reviewer
docs-writer
openscad
playwright-cli
pr-creator
```

Loaded from `~/.agents/skills/`:

```text
code-reviewer
docs-writer
godot-cli
openscad-cli
pr-creator
```

Install/restore them with this repo:

```bash
yadm clone git@github.com:dobleuber/pi-agent.git
```

If the repo is already cloned on the machine:

```bash
yadm pull
```

Tool prerequisites used by those skills:

```powershell
# OpenSCAD skill
winget install OpenSCAD.OpenSCAD

# Godot skill: install Godot 4.x and update the executable path inside
# ~/.agents/skills/godot-cli/SKILL.md if it differs on the new machine.
```

For `playwright-cli`, install the CLI if it is not already available:

```bash
npm install -g playwright-cli
# or use npx playwright-cli when needed
```

Verify:

```bash
find ~/.codex/skills -maxdepth 3 -name SKILL.md | sort
find ~/.agents/skills -maxdepth 3 -name SKILL.md | sort
```

### 4. Codex built-in/runtime skills

These are installed by Codex itself, not by this repo:

```text
skill-creator
skill-installer
slides
spreadsheets
```

After installing Codex on a new machine, verify:

```bash
find ~/.codex/skills/.system -name SKILL.md | sort
find ~/.codex/skills/codex-primary-runtime -name SKILL.md | sort
```

### 5. Pi package skills

These Pi packages are configured in `.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:pi-updater",
    "npm:pi-subagents",
    "npm:pi-interactive-shell"
  ]
}
```

Install/update them after `yadm clone`:

```bash
pi update --extensions
```

Expected bundled skills include:

```text
pi-subagents
pi-interactive-shell
```

Verify:

```bash
pi list
```

### 6. Verify skills in Pi

Start Pi and reload resources:

```text
/reload
```

The startup header should list the expected skills. You can invoke one explicitly with:

```text
/skill:<skill-name>
```

## Daily use

Check changes:

```bash
yadm status
```

Commit configuration changes:

```bash
yadm add .pi/agent/settings.json .pi/agent/models.json .pi/agent/extensions \n  .codex/skills/code-reviewer .codex/skills/docs-writer .codex/skills/openscad \n  .codex/skills/playwright-cli .codex/skills/pr-creator \n  .agents/skills/code-reviewer .agents/skills/docs-writer .agents/skills/godot-cli \n  .agents/skills/openscad-cli .agents/skills/pr-creator
yadm commit -m "Update pi agent config"
yadm push
```
