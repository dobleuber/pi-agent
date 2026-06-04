---
name: codegraph-cli
description: Use when exploring, understanding, debugging, refactoring, or assessing impact in a code repository with the CodeGraph CLI available. Especially relevant when `.codegraph/` exists or when a repo should be initialized with CodeGraph.
---

# CodeGraph CLI Workflow

Use CodeGraph through the `codegraph` CLI. Pi does not use CodeGraph MCP directly in this setup.

## Before broad code exploration

1. Confirm `codegraph` is available:

   ```bash
   command -v codegraph
   ```

2. If this is clearly a code repository and `.codegraph/` is missing, initialize before significant exploration:

   ```bash
   codegraph init -i
   ```

   Do not auto-initialize in home directories, config-only directories, generated directories, or ambiguous locations. Ask first when uncertain.

3. If `.codegraph/` exists but may be stale, sync before relying on it:

   ```bash
   codegraph sync
   ```

   Sync is especially appropriate after branch changes, merges, rebases, significant file edits, debugging, refactoring, and impact analysis.

## Preferred commands

Use these before broad `rg`/`find`/file-read exploration when `.codegraph/` exists:

| Intent | Command |
|---|---|
| Map a task, feature, or subsystem | `codegraph context "<task>"` |
| Find a symbol, function, class, route, or handler | `codegraph query "<symbol>"` |
| Inspect callers | `codegraph callers "<symbol>"` |
| Inspect callees | `codegraph callees "<symbol>"` |
| Assess change impact | `codegraph impact "<symbol>"` |
| Check index health | `codegraph status` |
| Refresh index | `codegraph sync` |

## Fallbacks

- If `codegraph` is unavailable, report that and use normal tools.
- If CodeGraph output is incomplete, use `rg`, `find`, and file reads to verify or supplement specific details.
- Treat `.codegraph/` as generated local state that should normally be ignored by version control.

## Optional Git hooks

For repositories that should keep the index fresh across branch/history changes, install local hooks from the repository root:

```bash
pi-codegraph-hooks install
```

Include affected-test reporting in `pre-commit`:

```bash
pi-codegraph-hooks install --pre-commit
```

Remove managed hook blocks:

```bash
pi-codegraph-hooks remove
```
