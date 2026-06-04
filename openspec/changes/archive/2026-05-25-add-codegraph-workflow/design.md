## Context

This repository manages the user's portable Pi coding-agent configuration. Pi loads global context from files such as `~/.pi/agent/AGENTS.md`, skills from configured skill directories, and project-local resources from repositories. Pi intentionally has no native MCP support, so CodeGraph's MCP integration cannot be the primary integration path for Pi.

CodeGraph is still useful as a globally installed CLI. It can initialize a project-local `.codegraph/` index, provide semantic context with `codegraph context`, locate symbols with `codegraph query`, inspect relationships with `codegraph callers` and `codegraph callees`, estimate change impact with `codegraph impact`, and refresh indexes with `codegraph sync`. The workflow should make these commands part of Pi's normal exploration behavior without requiring MCP.

The configuration must remain portable through this `pi-agent` repo and must avoid globally forcing Git behavior in every repository. Repository hooks should be opt-in per project.

## Goals / Non-Goals

**Goals:**

- Make `codegraph` available globally on the machine.
- Add persistent Pi workflow guidance so future sessions prefer CodeGraph CLI for codebase exploration when available.
- Automatically initialize CodeGraph before significant code exploration in repositories that do not yet have `.codegraph/`.
- Refresh CodeGraph indexes on demand before analysis, debugging, refactoring, and when branch changes may have made the index stale.
- Provide an opt-in helper for installing per-repository Git hooks that run `codegraph sync` after checkout, merge, and rewrite events.
- Document the workflow and operational commands in the pi-agent repo.

**Non-Goals:**

- Add MCP support to Pi.
- Configure Claude, Codex, Cursor, opencode, or Hermes MCP integrations as part of this change.
- Run a persistent CodeGraph daemon outside normal CodeGraph CLI behavior.
- Install global Git hooks that affect every repository automatically.
- Commit generated `.codegraph/` index directories to version control.

## Decisions

### Use CLI-first integration instead of MCP

Pi does not provide native MCP support. The integration will therefore treat CodeGraph as a CLI tool invoked through Pi's normal shell workflow. This avoids building a new extension before getting value from CodeGraph and keeps the setup simple and portable.

Alternative considered: build or install an MCP bridge extension for Pi. This was rejected for this change because the user explicitly accepted CLI-only usage and the immediate need is workflow integration, not tool protocol support.

### Store workflow guidance as global Pi context and/or a skill

The workflow needs to be available in future sessions without relying on memory from this conversation. The implementation should add tracked guidance in the pi-agent repository, preferably in global Pi context (`.pi/agent/AGENTS.md`) and, if useful, a focused skill under `.agents/skills/codegraph-cli/`.

Global context is appropriate for default behavior: initialize, prefer CodeGraph commands, and sync when stale. A skill is appropriate if we want explicit, reusable detailed instructions for CodeGraph-heavy tasks. If both are used, the global context should stay short and point to the skill for details.

Alternative considered: document only in `README.md`. Documentation alone is not enough because Pi would not automatically apply the workflow during sessions.

### Auto-initialize only before significant code exploration

The workflow should initialize CodeGraph automatically with `codegraph init -i` when working in a code repository that lacks `.codegraph/`, but only before meaningful code exploration or architecture/debugging/refactor work. This avoids creating `.codegraph/` directories during trivial file edits or non-code tasks.

A repository should be considered a code repository when it has clear signals such as `.git/`, source files, package manifests, build files, or language project files. The assistant should avoid initializing in home directories, config-only directories, generated directories, or non-project locations unless the user explicitly requests it.

Alternative considered: initialize on every Pi session start. This was rejected because it can create unnecessary generated state and latency in directories where CodeGraph is not useful.

### Sync on demand plus opt-in repository hooks

The baseline refresh strategy is to run `codegraph sync` before tasks where staleness matters: architecture analysis, debugging, refactoring, impact analysis, or when the user/assistant knows files or branches recently changed. This keeps ordinary interactions fast.

For repositories where freshness is important, an opt-in helper should install local Git hooks:

- `post-checkout`: run `codegraph sync` after branch or file checkout changes.
- `post-merge`: run `codegraph sync` after pulls/merges.
- `post-rewrite`: run `codegraph sync` after rebase/amend rewrites.
- Optional `pre-commit`: run `codegraph affected` on changed files to identify impacted tests, without blocking commits unless explicitly configured later.

Hook scripts should be defensive: no-op when `codegraph` is missing, no-op when `.codegraph/` is absent, run from the repository root, and avoid noisy output. Sync can run in the background to reduce perceived Git latency.

Alternative considered: global Git hooks. This was rejected because it would surprise unrelated repositories and make the user's global Git behavior depend on CodeGraph.

### Keep generated indexes untracked

The `.codegraph/` directory should be treated as generated local state. The workflow should document that project repositories should ignore `.codegraph/` unless a project has a deliberate reason to commit it.

Alternative considered: add `.codegraph/` to this repo's root `.gitignore` only. That protects this repository but does not help other projects. The assistant should still recommend ignoring `.codegraph/` in each initialized project if needed.

## Risks / Trade-offs

- [Risk] Auto-initialization may create `.codegraph/` in an unintended repository → Mitigation: only initialize before significant code exploration and only in directories that look like code repositories; ask first when uncertain.
- [Risk] `codegraph init -i` or `codegraph sync` may add latency in large repositories → Mitigation: avoid sync on every turn; use on-demand sync and optional background hook sync.
- [Risk] Hook scripts may mask sync failures if they run quietly → Mitigation: keep hooks non-blocking by default but provide a documented manual `codegraph status` / `codegraph sync` path for troubleshooting.
- [Risk] Global instructions may cause overuse of CodeGraph for tiny tasks → Mitigation: phrase guidance around significant exploration, architecture, debugging, refactoring, and impact analysis rather than every edit.
- [Risk] CodeGraph CLI changes could alter command behavior → Mitigation: document how to check `codegraph --version`, update the global package, and fall back to `rg/read` when CodeGraph is unavailable.
