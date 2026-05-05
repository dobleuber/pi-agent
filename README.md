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

## Install Pi skills

This repo tracks portable global Pi skills in:

```text
~/.pi/agent/skills/
```

After `yadm clone`, those skills are already restored in the right location. Restart Pi or run this inside Pi:

```text
/reload
```

To add a new local skill, create a directory with a `SKILL.md` file:

```text
~/.pi/agent/skills/my-skill/SKILL.md
```

Minimal `SKILL.md`:

```markdown
---
name: my-skill
description: Use this skill when ...
---

# My Skill

Instructions for the agent.
```

Then track it with yadm:

```bash
yadm add .pi/agent/skills/my-skill
yadm commit -m "Add my-skill"
yadm push
```

If a skill has dependencies, install them from the skill directory and do not commit generated dependencies like `node_modules/`:

```bash
cd ~/.pi/agent/skills/my-skill
npm install
```

Pi also loads skills from other locations, but they are only portable if you track or reinstall them separately:

```text
~/.agents/skills/
.pi/skills/
.agents/skills/
```

For skills distributed as Pi packages, install the package and commit the resulting settings change:

```bash
pi install npm:<package-name>
yadm add .pi/agent/settings.json
yadm commit -m "Add pi skill package"
yadm push
```

Use a skill inside Pi with:

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
