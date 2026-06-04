## 1. Global CodeGraph Installation

- [x] 1.1 Install `@colbymchenry/codegraph` globally or install the upstream binary so `codegraph` is available on `PATH`.
- [x] 1.2 Verify `codegraph --version` succeeds from a normal shell.
- [x] 1.3 Document the chosen install and update commands in `README.md`.

## 2. Pi Workflow Guidance

- [x] 2.1 Add tracked global Pi instructions that define the CLI-first CodeGraph workflow.
- [x] 2.2 Include auto-initialization guidance: run `codegraph init -i` before significant code exploration in code repositories without `.codegraph/`.
- [x] 2.3 Include CodeGraph-first exploration guidance for `codegraph context`, `codegraph query`, `codegraph callers`, `codegraph callees`, and `codegraph impact` when `.codegraph/` exists.
- [x] 2.4 Include fallback guidance for unavailable or incomplete CodeGraph output.
- [x] 2.5 Include on-demand sync guidance for stale indexes, branch changes, analysis, debugging, refactoring, and impact analysis.

## 3. Optional Repository Hook Support

- [x] 3.1 Add a helper script for installing repository-local CodeGraph Git hooks.
- [x] 3.2 Implement defensive `post-checkout`, `post-merge`, and `post-rewrite` hook behavior that no-ops when `codegraph` or `.codegraph/` is unavailable.
- [x] 3.3 Add optional pre-commit affected-test reporting using `codegraph affected` without blocking commits by default.
- [x] 3.4 Document how to enable, verify, and remove the repository-local hooks.

## 4. Documentation and Generated State Policy

- [x] 4.1 Document the expected daily workflow: auto-init, CodeGraph-first exploration, on-demand sync, and hook-based branch refresh.
- [x] 4.2 Document that `.codegraph/` is generated local state and should normally be ignored by version control.
- [x] 4.3 Add `.codegraph/` to this repository's ignore rules if it is not already ignored.

## 5. Verification

- [x] 5.1 Run `codegraph --version` to verify global CLI availability.
- [x] 5.2 In a disposable or selected repository, verify `codegraph init -i` creates a usable `.codegraph/` index.
- [x] 5.3 Verify `codegraph context`, `codegraph query`, and `codegraph sync` work in an initialized repository.
- [x] 5.4 Verify installed hooks do not block Git operations when `codegraph` is missing or `.codegraph/` is absent.
- [x] 5.5 Run `npx --yes @fission-ai/openspec@latest status --change add-codegraph-workflow` and confirm all artifacts are complete before implementation.
