# Pi Router Correctness and Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make routed-turn completion and English-context restoration deterministic, protect every masked token during translation, and remove obsolete HTTP/local-model transport abstractions.

**Architecture:** Pi Router will use Pi AI exclusively. Routed turns gain stable IDs and always produce completed details. Translation uses one shared placeholder-multiset validator, while context restoration refuses ambiguous legacy text matches.

**Tech Stack:** TypeScript, Node test runner, Pi extension API, `@earendil-works/pi-ai`, OpenSpec.

---

### Task 1: Complete every routed turn

**Files:**
- Modify: `.pi/agent/extensions/pi-router/tests/extension.test.ts`
- Modify: `.pi/agent/extensions/pi-router/src/index.ts`
- Modify: `.pi/agent/extensions/pi-router/src/details.ts`

- [ ] Add failing tests proving untranslated, empty, and unsupported assistant answers produce `phase: "complete"` details.
- [ ] Run the focused extension tests and confirm failures are caused by dangling pre-dispatch details.
- [ ] Add stable `turnId` metadata and a single completion helper; complete untranslated answers unchanged and skipped answers with explicit fallback events.
- [ ] Run focused tests and commit.

### Task 2: Make context restoration ambiguity-safe

**Files:**
- Modify: `.pi/agent/extensions/pi-router/tests/extension.test.ts`
- Modify: `.pi/agent/extensions/pi-router/src/index.ts`
- Modify: `.pi/agent/extensions/pi-router/src/details.ts`

- [ ] Add failing tests for duplicate Spanish answers, unmatched details, truncated branches, and legacy unique matches.
- [ ] Run focused tests and confirm ambiguous duplicates are currently replaced.
- [ ] Match new details deterministically using turn/order metadata and permit legacy text fallback only for one detail and one assistant candidate.
- [ ] Run focused tests and commit.

### Task 3: Validate every placeholder type

**Files:**
- Create: `.pi/agent/extensions/pi-router/src/placeholder-integrity.ts`
- Create: `.pi/agent/extensions/pi-router/tests/placeholder-integrity.test.ts`
- Modify: `.pi/agent/extensions/pi-router/src/final-answer.ts`
- Modify: `.pi/agent/extensions/pi-router/tests/final-answer.test.ts`

- [ ] Add failing tests for missing/duplicated `§P…§`, inline, and preserved-block placeholders, including repair output.
- [ ] Run focused tests and confirm non-inline corruption is accepted.
- [ ] Implement normalized placeholder-multiset extraction and validation, then invoke it from `finalizeTranslatedChunk()` in both modes.
- [ ] Run focused tests and commit.

### Task 4: Remove HTTP transport and add fidelity guards

**Files:**
- Modify: `.pi/agent/extensions/pi-router/src/config.ts`
- Modify: `.pi/agent/extensions/pi-router/src/pi-ai-client.ts`
- Modify: `.pi/agent/extensions/pi-router/src/router-model.ts`
- Modify: `.pi/agent/extensions/pi-router/src/final-answer.ts`
- Modify: `.pi/agent/extensions/pi-router/tests/config.test.ts`
- Modify: `.pi/agent/extensions/pi-router/tests/router-model.test.ts`
- Modify: `.pi/agent/extensions/pi-router/tests/final-answer.test.ts`

- [ ] Add failing Pi AI-only tests and fidelity tests for lost commands, paths, quoted strings, and severe structure collapse.
- [ ] Run focused tests and confirm HTTP configuration/transport and missing-token outputs remain possible.
- [ ] Remove `baseUrl`, `shouldUsePiAi()`, direct fetch branches, llama stop tokens, and HTTP test adapters; route all calls through injected `PiAiRuntime`.
- [ ] Add deterministic required-token and structural-fidelity validation with passthrough warnings.
- [ ] Run focused tests and commit.

### Task 5: Specs, cleanup, and verification

**Files:**
- Modify: `openspec/changes/remove-router-local-mode/specs/router-remote-only-model/spec.md`
- Modify: `openspec/changes/remove-router-local-mode/specs/router-example-leakage-guard/spec.md`
- Modify: `openspec/specs/router-remote-only-model/spec.md`
- Modify: `openspec/specs/router-example-leakage-guard/spec.md`
- Modify: `.pi/agent/extensions/pi-router/tests/final-answer.test.ts`

- [ ] Update specs for Pi AI-only transport, deterministic completion, placeholder integrity, and local fidelity fallback.
- [ ] Remove stale local-router terminology and dead test helpers.
- [ ] Run `npx tsc --noEmit`, full `npm test` repeatedly, `openspec validate --all --strict`, and `git diff --check`.
- [ ] Deploy the verified tree to `~/.pi/agent/extensions/pi-router/`, preserving runtime state and external backups.
- [ ] Commit final documentation/cleanup and report verification evidence without pushing.
