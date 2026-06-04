## Why

Pi does not provide native MCP integration, so CodeGraph must be integrated into this Pi configuration as a CLI-first workflow. A global CodeGraph workflow will let Pi build and use local semantic code indexes automatically, reducing repeated grep/read exploration while keeping the setup portable through this pi-agent repository.

## What Changes

- Install CodeGraph as a globally available CLI tool.
- Add global Pi workflow guidance for CodeGraph usage:
  - Automatically initialize CodeGraph with `codegraph init -i` before significant code exploration when working in a code repository that does not have `.codegraph/`.
  - Prefer CodeGraph CLI commands such as `codegraph context`, `codegraph query`, `codegraph callers`, `codegraph callees`, and `codegraph impact` when `.codegraph/` exists.
  - Fall back to `rg`, `find`, and file reads only for details not covered by CodeGraph output or for verification.
- Define the refresh strategy:
  - Run `codegraph sync` on demand before analysis, refactoring, debugging, or other tasks where the existing index may be stale.
  - Run `codegraph sync` after branch changes, merges, and rewrites when hooks are enabled for a repository.
- Provide optional per-repository Git hook support for keeping CodeGraph indexes current:
  - `post-checkout` for branch/file checkout changes.
  - `post-merge` for pull/merge updates.
  - `post-rewrite` for rebase/amend rewrites.
  - Optional `pre-commit` support for `codegraph affected` to identify impacted tests.
- Document installation, update, initialization, sync, and hook usage in the pi-agent workflow documentation.

## Capabilities

### New Capabilities
- `codegraph-cli-workflow`: Defines the global CLI-first CodeGraph workflow for Pi, including automatic initialization, preferred query commands, sync policy, and optional per-repository Git hooks.

### Modified Capabilities

None.

## Impact

- Adds a global dependency on the `codegraph` CLI (`@colbymchenry/codegraph` or the upstream installer binary).
- Affects global Pi instructions and/or skills tracked by this pi-agent repository.
- Adds documentation for CodeGraph setup and usage to the pi-agent workflow.
- May add helper scripts for installing repository-local Git hooks.
- Creates `.codegraph/` directories in code repositories where the workflow auto-initializes CodeGraph; those indexes remain project-local generated artifacts and should not be committed unless a project explicitly chooses otherwise.
