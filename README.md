# Pi Agent Configuration

This repository is managed with [yadm](https://yadm.io/) and tracks my portable Pi coding-agent configuration in place, without duplicating files.

## What is tracked

- `.pi/agent/settings.json`
- `.pi/agent/models.json`
- `.pi/agent/extensions/`
- `.pi/agent/skills/`
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

This yadm repo restores Pi's settings, including the skill search paths, but some skills live outside `.pi/agent` and must be restored separately on a new machine.

Current skill paths from `.pi/agent/settings.json`:

```json
{
  "skills": [
    "~/.codex/skills",
    "~/.pi/skills",
    "-C:/Users/wbert/.agents/skills/playwright-cli"
  ]
}
```

Pi also discovers `~/.agents/skills/` by default. The explicit exclusion avoids loading the duplicate `~/.agents/skills/playwright-cli` because `~/.codex/skills/playwright-cli` is used instead.

### 1. OpenSpec skills

Currently installed in `~/.pi/skills/`:

```text
openspec-apply-change
openspec-archive-change
openspec-bulk-archive-change
openspec-continue-change
openspec-explore
openspec-ff-change
openspec-new-change
openspec-onboard
openspec-sync-specs
openspec-verify-change
```

Restore this directory from your OpenSpec setup or copy it from an existing machine:

```bash
mkdir -p ~/.pi
# copy or sync the existing ~/.pi/skills directory into ~/.pi/skills
```

Then verify:

```bash
find ~/.pi/skills -name SKILL.md | sort
```

### 2. Codex skills used by Pi

Currently loaded from `~/.codex/skills/`:

```text
skill-creator
skill-installer
slides
spreadsheets
openscad
playwright-cli
```

These come from the Codex skills installation. On a new machine, install or restore Codex skills first, then verify:

```bash
find ~/.codex/skills -name SKILL.md | sort
```

Pi sees this directory because `.pi/agent/settings.json` includes:

```json
"~/.codex/skills"
```

### 3. Agents skills

Currently loaded from `~/.agents/skills/`:

```text
code-reviewer
docs-writer
godot-cli
openscad-cli
pr-creator
```

There is also a local `playwright-cli` there, but it is intentionally excluded in Pi settings to avoid duplicating the Codex `playwright-cli` skill.

Restore these directories from your agents skills setup or copy them from an existing machine:

```bash
mkdir -p ~/.agents/skills
# copy or sync the required skill directories into ~/.agents/skills
```

Then verify:

```bash
find ~/.agents/skills -maxdepth 2 -name SKILL.md | sort
```

### 4. Superpowers skills

Superpowers is currently installed as a Git repo at:

```text
~/.codex/superpowers
```

and exposed to Pi through this symlink:

```text
~/.agents/skills/superpowers -> ~/.codex/superpowers
```

Restore it with:

```bash
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers ~/.agents/skills/superpowers
```

On Windows Git Bash, if symlink creation is not enabled, copy the directory instead:

```bash
mkdir -p ~/.agents/skills
cp -R ~/.codex/superpowers ~/.agents/skills/superpowers
```

Currently used Superpowers skills include:

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

### 5. Pi package skills

This setup also installs Pi packages through `.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:pi-updater",
    "npm:pi-subagents",
    "npm:pi-interactive-shell"
  ]
}
```

On a new machine, after `yadm clone`, start Pi or run:

```bash
pi update --extensions
```

Pi should install/update those packages and expose their bundled skills, such as `pi-subagents` and `pi-interactive-shell`.

### 6. Verify skills in Pi

After restoring the directories above, start Pi and reload resources:

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
yadm add .pi/agent/settings.json .pi/agent/models.json .pi/agent/extensions .pi/agent/skills
yadm commit -m "Update pi agent config"
yadm push
```
