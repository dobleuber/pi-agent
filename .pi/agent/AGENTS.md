# Global Pi Agent Instructions

## CodeGraph CLI workflow

Pi does not have native MCP support here, so use CodeGraph through the `codegraph` CLI.

When working in a code repository:

- Before broad repository exploration with `rg`, `find`, or multi-file reads, apply the CodeGraph-first workflow. Use the `codegraph-first-exploration` skill when available; it is the stop-before-grep guardrail, while `codegraph-cli` is the detailed command reference.

- If the task requires significant code exploration, architecture analysis, debugging, refactoring, or impact analysis and `.codegraph/` does not exist, initialize CodeGraph first:

  ```bash
  codegraph init -i
  ```

- If `.codegraph/` exists, prefer CodeGraph before broad grep/read exploration:
  - Use `codegraph context "<task>"` to map a feature, subsystem, or question.
  - Use `codegraph query "<symbol>"` to find symbols, handlers, routes, classes, or functions.
  - Use `codegraph callers "<symbol>"` and `codegraph callees "<symbol>"` for call flow.
  - Use `codegraph impact "<symbol>"` before changes that may affect dependents.
  - Use `codegraph status` to inspect index health.

- Run `codegraph sync` before relying on CodeGraph when the index may be stale, especially after branch changes, merges, rebases, significant file edits, debugging, refactoring, or impact analysis.

- Do not initialize CodeGraph automatically in directories that are not clearly code repositories. Ask first when uncertain.

- If `codegraph` is unavailable or CodeGraph output does not answer a specific detail, say so and fall back to `rg`, `find`, and direct file reads.

- Treat `.codegraph/` as generated local state. It should normally be ignored by version control unless a project explicitly documents otherwise.

## Context Mode workflow

Context Mode is available through the `context-mode` Pi package and registered `ctx_*` tools. Use it as a context-hygiene layer, not as a replacement for CodeGraph.

Routing hierarchy:

- Use CodeGraph first for repository architecture, symbol lookup, callers/callees, and impact analysis.
- Use Context Mode `ctx_*` tools for large or noisy outputs, logs, fetched content, generated bulk analysis, and session-continuity queries.
- Use Pi's direct `read` tool for exact source-file inspection.
- Use Pi's `edit`/`write` tools for precise changes.

Avoid dumping huge raw Bash, log, JSON, or fetched outputs into model context when a Context Mode tool can sandbox, index, or summarize them instead.
