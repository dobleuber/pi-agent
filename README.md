# Pi Agent Configuration

This repository is managed with [yadm](https://yadm.io/) and tracks my portable Pi coding-agent configuration in place, without duplicating files.

## What is tracked

- `.pi/agent/settings.json`
- `.pi/agent/models.json`
- `.pi/agent/extensions/`
- `.agents/skills/` for all portable skills used by Pi, including:
  - OpenSpec skills: `.agents/skills/openspec-*`
  - Codex/system skills copied for Pi: `skill-creator`, `skill-installer`, `slides`, `spreadsheets`
  - Local workflow/tool skills: `code-reviewer`, `docs-writer`, `openscad`, `playwright-cli`, `pr-creator`, `godot-cli`, `openscad-cli`
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

For Pi, this setup keeps the portable tracked copies in one place:

```text
~/.agents/skills/
```

Pi can still load additional, non-duplicated skills from `~/.codex/skills` and `~/.pi/skills`.

`.pi/agent/settings.json` still includes `~/.codex/skills` and `~/.pi/skills` so future skills installed there are loaded. Known skills that were consolidated into `~/.agents/skills` are explicitly excluded from those paths to avoid duplicate names.

### 1. Restore tracked skills with yadm

Most of the active Pi skills are tracked directly in this repo under `.agents/skills/`.

Install/restore them with:

```bash
yadm clone git@github.com:dobleuber/pi-agent.git
```

If the repo already exists on the machine:

```bash
yadm pull
```

Tracked skill groups:

```text
~/.agents/skills/code-reviewer
~/.agents/skills/docs-writer
~/.agents/skills/godot-cli
~/.agents/skills/openscad
~/.agents/skills/openscad-cli
~/.agents/skills/openspec-*
~/.agents/skills/playwright-cli
~/.agents/skills/pr-creator
~/.agents/skills/skill-creator
~/.agents/skills/skill-installer
~/.agents/skills/slides
~/.agents/skills/spreadsheets
```

Tool prerequisites used by some of those skills:

```powershell
# OpenSCAD skills
winget install OpenSCAD.OpenSCAD

# Godot skill: install Godot 4.x and update the executable path inside
# ~/.agents/skills/godot-cli/SKILL.md if it differs on the new machine.
```

For `playwright-cli`, install the CLI if it is not already available:

```bash
npm install -g playwright-cli
# or use npx playwright-cli when needed
```

### 2. OpenSpec

Source: <https://openspec.dev/> / <https://github.com/Fission-AI/OpenSpec>

Current CLI version used when these skills were generated:

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

This setup uses OpenSpec's **custom expanded workflow** with Pi output. Configure OpenSpec:

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

OpenSpec's Pi integration generates skills into `~/.pi/skills`. Since this repo keeps Pi skills consolidated in `~/.agents/skills`, move them after generation:

```bash
cd ~
openspec init --tools pi --profile custom --force
mkdir -p ~/.agents/skills
cp -R ~/.pi/skills/openspec-* ~/.agents/skills/
rm -rf ~/.pi/skills

# Later, after upgrading OpenSpec:
openspec update --force
cp -R ~/.pi/skills/openspec-* ~/.agents/skills/
rm -rf ~/.pi/skills
```

Prompts remain in `~/.pi/prompts/`, because `.pi/agent/settings.json` loads that prompt directory. The generated `~/.pi/skills/openspec-*` copies are excluded from Pi loading after they are copied into `~/.agents/skills`, avoiding duplicate OpenSpec skill names.

Expected OpenSpec skills after consolidation:

```text
~/.agents/skills/openspec-apply-change/SKILL.md
~/.agents/skills/openspec-archive-change/SKILL.md
~/.agents/skills/openspec-bulk-archive-change/SKILL.md
~/.agents/skills/openspec-continue-change/SKILL.md
~/.agents/skills/openspec-explore/SKILL.md
~/.agents/skills/openspec-ff-change/SKILL.md
~/.agents/skills/openspec-new-change/SKILL.md
~/.agents/skills/openspec-onboard/SKILL.md
~/.agents/skills/openspec-sync-specs/SKILL.md
~/.agents/skills/openspec-verify-change/SKILL.md
```

Expected OpenSpec prompts:

```text
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
find ~/.agents/skills -maxdepth 2 -name 'SKILL.md' | sort
find ~/.pi/prompts -name 'opsx-*.md' | sort
```

### 3. Superpowers

Source: <https://github.com/obra/superpowers>

Install Superpowers directly under `.agents/skills`:

```bash
git clone https://github.com/obra/superpowers.git ~/.agents/skills/superpowers
```

Do not vendor the Superpowers repo in yadm; `.gitignore` excludes `.agents/skills/superpowers/`. Reinstall/update it from upstream instead:

```bash
git -C ~/.agents/skills/superpowers pull
```

Expected Superpowers skills:

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
find ~/.agents/skills/superpowers/skills -name SKILL.md | sort
```

### 4. Pi package skills

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

### 5. Verify skills in Pi

Start Pi and reload resources:

```text
/reload
```

The startup header should list skills from `~/.agents/skills`. You can invoke one explicitly with:

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
yadm add .pi/agent/settings.json .pi/agent/models.json .pi/agent/extensions .agents/skills
yadm commit -m "Update pi agent config"
yadm push
```
