## Context

The repository already documents a CLI-first CodeGraph workflow for Pi in the global agent instructions, the `codegraph-cli` skill, README setup guidance, and the `codegraph-cli-workflow` OpenSpec capability. That guidance is correct but broad: Pi can still proceed directly to `rg`, `find`, or multiple file reads during repository exploration even when CodeGraph is available.

The desired behavior change is agent-level: Pi should pause before broad manual exploration and use CodeGraph first. This is best captured as a focused process skill plus a small global-instruction reinforcement, while keeping `codegraph-cli` as the detailed reference for commands and fallbacks.

## Goals / Non-Goals

**Goals:**

- Make CodeGraph-first exploration more reliably trigger during autonomous Pi work.
- Add a dedicated `codegraph-first-exploration` skill that acts as a short behavioral guardrail before broad search/read workflows.
- Strengthen global Pi instructions so broad repository exploration with `rg`, `find`, or multi-file reads is preceded by an appropriate CodeGraph command when possible.
- Preserve direct search, file reads, and tests as verification and gap-filling steps after CodeGraph.

**Non-Goals:**

- Do not replace the existing `codegraph-cli` skill.
- Do not add wrapper scripts in this change.
- Do not require CodeGraph for tiny known-file edits, non-code tasks, or ambiguous directories that are not clearly code repositories.
- Do not change CodeGraph installation or hook behavior.

## Decisions

### Add a focused guardrail skill instead of only expanding `codegraph-cli`

Create `.agents/skills/codegraph-first-exploration/SKILL.md` with a trigger description aimed at exploration moments: understanding code, locating implementation, debugging, reviewing, refactoring, assessing impact, and especially before broad `rg`, `find`, or file-read usage.

Rationale: the existing `codegraph-cli` skill is a command reference. A narrower skill can trigger earlier and state the behavioral stop condition more forcefully without making the reference skill too rigid.

Alternative considered: only update the existing skill. This is simpler but less likely to catch the failure mode where Pi forgets CodeGraph before manual exploration.

### Keep `codegraph-cli` as the detailed reference

The new skill should be concise and should point to the existing `codegraph-cli` skill for detailed command semantics. It should include only the essential decision flow: check repo/tool/index, use CodeGraph first, then verify with direct tools.

Rationale: splitting guardrail from reference avoids duplicated long instructions and reduces context cost when the main issue is timing and habit, not command syntax.

Alternative considered: duplicate all CodeGraph command guidance in the new skill. This increases drift risk and context usage.

### Reinforce global instructions with the stop-before-grep rule

Update `~/.pi/agent/AGENTS.md` to explicitly state that before broad repository exploration using grep/find/read, Pi must apply the CodeGraph-first workflow. If `.codegraph/` exists, run an appropriate CodeGraph command first; if no index exists and the task is significant in a clear code repo, initialize first.

Rationale: global instructions are always available, while skills depend on trigger matching. The global reinforcement improves baseline behavior even when a skill does not trigger.

Alternative considered: rely on the new skill trigger only. This is cleaner but less robust for the specific failure mode.

## Risks / Trade-offs

- [Risk] The new skill overlaps with `codegraph-cli` and creates conflicting guidance. → Mitigation: make the new skill a short guardrail and explicitly defer detailed command reference to `codegraph-cli`.
- [Risk] Pi overuses CodeGraph for tiny tasks. → Mitigation: keep the exception for trivial known-file edits and non-code tasks.
- [Risk] CodeGraph output is incomplete or stale. → Mitigation: retain sync guidance and require direct reads/search/tests for verification and gap-filling.
- [Risk] Skill trigger language becomes too broad and fires for unrelated tasks. → Mitigation: focus the trigger on code repositories and broad code exploration, not general shell usage.
