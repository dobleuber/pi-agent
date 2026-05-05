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
