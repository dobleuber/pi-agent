## Why

Pi already has CodeGraph guidance, but it can still start broad `rg`, `find`, or multi-file read exploration before using CodeGraph. This change makes CodeGraph-first behavior more reliable by adding a focused skill and strengthening the global guidance that applies before broad repository exploration.

## What Changes

- Add a dedicated `codegraph-first-exploration` skill that acts as a behavioral guardrail before broad repository exploration.
- Update global Pi instructions to require CodeGraph-first exploration before broad grep/find/read workflows when CodeGraph is available or should be initialized.
- Keep the existing `codegraph-cli` skill as the detailed command reference; the new skill focuses on when to stop and use CodeGraph first.
- Clarify that direct search, file reads, and tests remain appropriate after CodeGraph for verification and gap-filling.
- No breaking changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `codegraph-cli-workflow`: Strengthen the existing CodeGraph workflow so Pi invokes CodeGraph before broad manual repository exploration and provides a focused skill trigger for that behavior.

## Impact

- Affects global Pi agent guidance in `~/.pi/agent/AGENTS.md` as tracked by this repository.
- Adds a new skill under `.agents/skills/codegraph-first-exploration/`.
- May update `.agents/skills/codegraph-cli/SKILL.md` only to cross-reference the new guardrail skill if useful.
- No runtime dependencies beyond the existing optional/global `codegraph` CLI workflow.
