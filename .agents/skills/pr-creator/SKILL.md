---
name: pr-creator
description: Use when creating, documenting, or updating a pull request, especially when repository templates, preflight evidence, or architecture/data-flow diagrams are required.
---

# Pull Request Creator

Create accurate, template-compliant pull requests. The repository's template and verification commands remain authoritative. PR Lens is an optional comprehension layer; it never replaces review findings, tests, or the PR template.

## Workflow

1. **Choose the branch workflow.**
   - For a normal PR, run `git branch --show-current` and do not work directly on `main`; create a descriptive branch if needed.
   - For a stacked PR, invoke `gh-stack` for branch placement, rebasing, pushing, and submission. Do not manually recreate a stack here.

2. **Locate and read the PR template.** Check, in order, `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/PULL_REQUEST_TEMPLATE/`. If several templates apply, choose the appropriate one or ask the user.

3. **Draft the description.** Preserve every required heading and checklist. Include a concise summary, implementation details, validation evidence, related issues, and known limitations. Never claim an unchecked item is complete.

4. **Run preflight.** Run the repository's documented preflight command (normally `npm run preflight`). Fix failures before creating the PR.

5. **Decide whether a diagram is useful.** Invoke PR Lens when the change crosses services, runtimes, API boundaries, queues, data stores, authentication boundaries, or other architectural/data-flow boundaries, or when the user explicitly requests a diagram. Skip it for typo-only, documentation-only, dependency-only, or otherwise trivial changes unless requested.

6. **Invoke the installed `pr-lens` skill when the condition in step 5 is met.** The vendored skill is pinned from `coldteadotai/pr-lens@ca6c900b5dfa43572a5ce38ffa1d14a38adf5810`; update it deliberately. Use this bounded handoff:

   > Invoke the installed `pr-lens` skill for this PR. Diagram the merge-base diff, not the branch tip. Prefer an agent-authored graph; do not use `analyze` or `canvas push`. Use the reviewed CLI version `@coldtea/pr-lens-cli@0.5.0`, validate before rendering, render the dark theme, and produce at most one architecture view and one data-flow view. Keep `.pr-lens/` scratch output uncommitted. Return the selected SVG paths and validation result.

   Follow the installed skill's references in `.agents/skills/pr-lens/`. Use the true merge base for the graph input. Do not send proprietary source to an additional model provider, publish a canvas, or invent review findings. PR Lens is a visual explanation, not a correctness verdict.

7. **Add the diagram without breaking the template.** Put the selected Markdown images in the template's existing description/architecture section; do not remove headings or checklists. Check `gh --version` before using `--attach` (`gh` 2.99 or newer is required). Use the generated local SVG paths with `gh pr create --attach`; attach only the overview and, when useful, the data-flow view. If the optional diagram fails, preserve the normal PR workflow, report the failure, and continue without publishing it. Do not use `canvas push` as a fallback for private code.

8. **Create or update the PR.** Write the final Markdown to a temporary body file to avoid shell-escaping problems:

   ```bash
   gh pr create \
     --title "type(scope): succinct description" \
     --body-file <body-file> \
     --attach .pr-lens/<overview-svg> \
     [--attach .pr-lens/<data-flow-svg>]
   ```

   Remove the temporary body file afterward. For an existing PR, use the equivalent `gh pr edit <number>` attachment flow. For a stacked PR, use `gh-stack` submission first, then update the generated body without changing stack bases.

## Quick reference

| Change shape | PR Lens action |
|---|---|
| One small local change | Skip unless requested |
| Cross-service/API/queue/database/auth change | Invoke `pr-lens` |
| Architecture-heavy refactor | Invoke `pr-lens`, usually with one flow |
| Docs, typo, or dependency-only change | Skip |

## Principles

- **Template first:** diagrams supplement the repository format; they do not replace it.
- **Evidence first:** tests and preflight determine readiness, not a valid diagram.
- **Privacy by default:** avoid `analyze` and hosted canvases for proprietary code.
- **Reproducibility:** use the pinned CLI version and the merge base; never use `@latest` in this workflow.
- **Accuracy:** diagrams must reflect the diff and may not contain invented findings.
- **Clean changes:** `.pr-lens/` is generated scratch output and must not be committed.

## Common mistakes

- Running PR Lens for every trivial PR and adding noise.
- Using the branch tip instead of the merge base.
- Running `@latest` or `analyze` without explicit approval.
- Publishing private code through `canvas push`.
- Letting a diagram replace required template sections or review findings.
- Blocking an otherwise valid PR because the optional diagram could not render.
