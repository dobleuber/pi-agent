---
name: codegraph-first-exploration
description: Use when exploring, understanding, locating, debugging, reviewing, refactoring, or assessing code in a repository, especially before using `rg`, `find`, broad file reads, or manual code search. Required when `.codegraph/` exists or when significant code exploration may need CodeGraph initialization.
---

# CodeGraph-First Exploration

## Stop before broad manual search

Before using `rg`, `find`, or reading multiple files to understand a codebase, apply this workflow. This skill is a guardrail for timing; use `codegraph-cli` for the detailed command reference.

## Workflow

1. Check whether the task needs repository exploration.
   - Use this workflow for architecture analysis, feature understanding, debugging, refactoring, code review, symbol lookup, call flow, or impact analysis.
   - Skip it for trivial known-file edits, non-code tasks, or single-file reads where the user already identified the exact file.

2. Confirm CodeGraph can be used.
   ```bash
   command -v codegraph
   ```
   If unavailable, say CodeGraph is unavailable and proceed with normal repository tools.

3. Check the index state before broad search.
   - If `.codegraph/` exists, use CodeGraph before broad `rg`/`find`/reads.
   - If `.codegraph/` is missing and this is a clear code repository with significant exploration needs, initialize first:
     ```bash
     codegraph init -i
     ```
   - Do not initialize automatically in home directories, config-only directories, generated directories, or ambiguous locations; ask first.

4. Choose the first CodeGraph command by intent.
   ```bash
   codegraph context "<task>"      # broad feature/subsystem understanding
   codegraph query "<symbol>"      # symbols, handlers, classes, routes, functions
   codegraph callers "<symbol>"    # who calls this
   codegraph callees "<symbol>"    # what this calls
   codegraph impact "<symbol>"     # likely dependents before changes
   ```

5. Sync only when freshness matters.
   ```bash
   codegraph sync
   ```
   Run this before relying on CodeGraph after branch changes, merges, rebases, significant edits, debugging, refactoring, or impact analysis. Do not sync solely because `.codegraph/` exists for a trivial task.

6. Use manual tools after CodeGraph.
   Use direct file reads, `rg`, `find`, tests, and project commands to verify CodeGraph output, inspect exact code, fill gaps, and complete changes. Do not treat CodeGraph as a substitute for verification.

## Failure modes to avoid

- Do not start broad `rg`, `find`, or multi-file reads first when `.codegraph/` exists.
- Do not initialize CodeGraph in unclear non-repository locations without asking.
- Do not stop after CodeGraph if exact files, tests, or implementation details still need verification.
