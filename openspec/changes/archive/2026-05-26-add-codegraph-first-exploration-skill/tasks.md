## 1. Skill Implementation

- [x] 1.1 Create `.agents/skills/codegraph-first-exploration/` with a valid `SKILL.md` frontmatter name and trigger description.
- [x] 1.2 Write a concise stop-before-grep workflow covering repo/tool/index checks, CodeGraph-first commands, initialization, sync, and manual verification fallbacks.
- [x] 1.3 Ensure the new skill references `codegraph-cli` as the detailed command reference without duplicating all existing guidance.

## 2. Global Guidance Updates

- [x] 2.1 Update `~/.pi/agent/AGENTS.md` tracked content to explicitly require CodeGraph-first workflow before broad `rg`, `find`, or multi-file read exploration in code repositories.
- [x] 2.2 Preserve existing exceptions for trivial known-file edits, non-code tasks, unclear repositories, unavailable CodeGraph, and incomplete CodeGraph output.
- [x] 2.3 Update README documentation if needed so the documented workflow mentions the new CodeGraph-first guardrail skill.

## 3. Verification

- [x] 3.1 Verify the new skill frontmatter is valid and discoverable by Pi skill loading conventions.
- [x] 3.2 Review the global instruction text for conflicts or duplication with the existing `codegraph-cli` skill.
- [x] 3.3 Run `npx --yes @fission-ai/openspec@latest status --change add-codegraph-first-exploration-skill` and confirm all artifacts are complete before implementation.
