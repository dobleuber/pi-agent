# Router Sol Max and Compaction Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make explicit “Sol Max” requests select `openai-codex/gpt-5.6-sol` at `max`, and preserve Pi native compaction while threading the current session ID into Codex requests.

**Architecture:** Extend the existing original-prompt override parser with an unequivocal bilingual Sol Max control. Add a focused compaction adapter that delegates preparation and summary generation to Pi's exported `compact()` implementation, but wraps Pi AI's stream so every summarization call receives `ctx.sessionManager.getSessionId()`; register it only while the router is enabled. Keep a source note linked to `earendil-works/pi#6477` stating that the workaround must be removed after upstream Pi threads session identity itself.

**Tech Stack:** TypeScript, Pi extension API, `@earendil-works/pi-coding-agent` compaction API, `@earendil-works/pi-ai/compat`, Node test runner.

---

### Task 1: Recognize explicit Sol Max intent

**Files:**
- Modify: `.pi/agent/extensions/pi-router/tests/adaptive-policy.test.ts`
- Modify: `.pi/agent/extensions/pi-router/src/thinking.ts`

- [ ] **Step 1: Write the failing bilingual regression cases**

Add `"Use Sol Max for this task"` and `"Usa Sol Max para esta tarea"` to the explicit-control table and assert `parseThinkingOverride(prompt)` returns `{ level: "max", source: "natural-language" }`. Add a managed-family assertion that either phrase selects `openai-codex/gpt-5.6-sol` with requested effort `max`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd .pi/agent/extensions/pi-router
node --import tsx --test tests/adaptive-policy.test.ts
```

Expected: FAIL because `parseThinkingOverride()` currently returns no override for `Use/Usa Sol Max`.

- [ ] **Step 3: Implement the minimal parser change**

Extend the maximum-intent expression in `naturalOverride()` with unequivocal `use sol max` and `usa sol max` alternatives. Do not make bare mentions of `Sol Max` binding, so quoted examples and descriptive text remain inert.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same focused command. Expected: all adaptive-policy tests pass.

### Task 2: Preserve session identity during router-managed compaction

**Files:**
- Create: `.pi/agent/extensions/pi-router/src/compaction.ts`
- Create: `.pi/agent/extensions/pi-router/tests/compaction.test.ts`
- Modify: `.pi/agent/extensions/pi-router/src/index.ts`
- Modify: `.pi/agent/extensions/pi-router/src/pi-ai-client.ts`
- Modify: `.pi/agent/extensions/pi-router/package-lock.json`
- Modify: `.pi/agent/extensions/pi-router/tests/extension.test.ts`

- [ ] **Step 1: Write a failing unit test for session propagation**

Create a test around an injected compaction adapter. Supply a fake native `compact` function that invokes the provided stream twice (covering split-turn history and prefix summaries), then assert both stream calls receive:

```ts
{ sessionId: "session-123" }
```

Also assert the adapter uses the current model, auth headers/environment, current thinking level, preparation object, custom instructions, and abort signal without replacing Pi's native compaction result.

- [ ] **Step 2: Run the compaction test and verify RED**

Run:

```bash
cd .pi/agent/extensions/pi-router
node --import tsx --test tests/compaction.test.ts
```

Expected: FAIL because `src/compaction.ts` does not exist.

- [ ] **Step 3: Implement the minimal adapter**

Create `compactWithSessionIdentity()` using Pi's exported `compact()` and Pi AI's `streamSimple`. Resolve auth through `ctx.modelRegistry.getApiKeyAndHeaders(ctx.model)`, obtain the stable identity from `ctx.sessionManager.getSessionId()`, and wrap the stream as:

```ts
(model, context, options) => streamSimple(model, context, { ...options, sessionId })
```

Return Pi's `CompactionResult` unchanged. Add this maintenance note immediately above the adapter registration/helper:

```ts
// Temporary workaround for https://github.com/earendil-works/pi/issues/6477.
// Remove this adapter once Pi native compaction forwards sessionId itself.
```

- [ ] **Step 4: Write the failing extension-registration test**

Assert `installPiRouter()` registers exactly one `session_before_compact` handler. With router state `on`, assert the handler returns `{ compaction: nativeResult }`; with state `off`, assert it returns `undefined` and does not invoke the adapter.

- [ ] **Step 5: Run the extension test and verify RED**

Run:

```bash
cd .pi/agent/extensions/pi-router
node --import tsx --test tests/extension.test.ts
```

Expected: FAIL because no `session_before_compact` handler is registered.

- [ ] **Step 6: Register the adapter only when routing is enabled**

Add an injectable `compactWithSessionIdentity` dependency for deterministic tests. Register `session_before_compact`; refresh persisted router state, return without interception when disabled, and otherwise return the adapter result as the extension-provided compaction. On adapter failure, notify with the exact error and return `{ cancel: true }` so Pi's extension runner blocks the known-broken native Luna fallback. Align the extension's locked Pi dependencies and Pi AI imports with installed Pi 0.80.6 so the adapter uses the same exported compaction and compatibility APIs as the host.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run both focused files. Expected: all tests pass.

### Task 3: Full verification and deployment

**Files:**
- Deploy verified extension files to: `~/.pi/agent/extensions/pi-router/`
- Preserve: `~/.pi/agent/extensions/pi-router/router-state.json`
- Leave untouched: `reports/`

- [ ] **Step 1: Run static and full automated verification**

```bash
cd .pi/agent/extensions/pi-router
npx tsc --noEmit
npm test
cd ../../../..
git diff --check
```

Expected: TypeScript exits 0, all tests pass, and `git diff --check` emits no errors.

- [ ] **Step 2: Back up and deploy without overwriting router state**

Create a timestamped backup under `~/.local/state/pi-router-backups/`, synchronize source/tests/package files to the active extension, and explicitly exclude `router-state.json` and `node_modules`.

- [ ] **Step 3: Verify the deployed extension**

Run `npx tsc --noEmit` and `npm test` from `~/.pi/agent/extensions/pi-router/`. Expected: both exit 0 with the same passing count as the worktree.

- [ ] **Step 4: Run isolated live regressions**

Launch a fresh Pi session for `Usa Sol Max para esta tarea. Responde exactamente: OK.` and verify persisted router details contain:

```text
policySelectedModel=openai-codex/gpt-5.6-sol
requestedThinkingLevel=max
effectiveThinkingLevel=max
overrideSource=natural-language
```

Launch a controlled fresh Luna session with router active and manually trigger compaction after enough synthetic context; verify a compaction entry is persisted and the error `gpt-5.6-luna-free-1p-codexswic-ev3` does not occur.

- [ ] **Step 5: Inspect repository state**

Confirm `reports/` remains untracked and untouched, no temporary live processes remain, and no push occurred.
