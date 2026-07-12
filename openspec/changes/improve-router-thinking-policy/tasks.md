## 1. Runtime contracts and failing policy tests

- [x] 1.1 Verify the installed Pi extension types and live event shapes for `ThinkingLevel`, `setModel()`, `setThinkingLevel()`, `getThinkingLevel()`, active tool discovery, and assistant `phase`; capture compatibility decisions in focused tests before production edits.
- [x] 1.2 Add failing tests that expand the shared thinking vocabulary to `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max` without normalizing `xhigh` down to `high`.
- [x] 1.3 Add failing bilingual table-driven tests for `@thinking:<level>`, unequivocal natural-language overrides, invalid controls, syntax-versus-language precedence, and quoted/example text that MUST NOT activate an override.
- [x] 1.4 Add failing table-driven policy tests for preserved external models: aligned trivial signals select `low`, uncertainty defaults to `medium`, complex work floors at `high`, and exhaustive/high-value work floors at `xhigh`.
- [x] 1.5 Add failing managed-family profile tests proving routine work selects Luna Max, complex bounded work selects Terra Max, difficult high-value work selects Sol XHigh, and explicit maximum intent selects Sol Max.
- [x] 1.6 Add failing regression tests proving GPT Mini suggestions for Luna Low/Medium, Terra XHigh, Sol Medium, Sol High, or automatic Sol Max cannot bypass the approved profile table.

## 2. Hybrid thinking and profile policy

- [x] 2.1 Replace the disconnected keyword-only selector in `src/thinking.ts` with shared level ordering, normalized policy signals, explicit-override parsing, and explainable decision types.
- [x] 2.2 Implement deterministic complexity, risk, depth, workflow, and contextual-continuation floors while keeping GPT Mini classification advisory and `medium` conservative for preserved external models.
- [x] 2.3 Implement the centralized managed-family coding frontier Luna Max → Terra Max → Sol XHigh → Sol Max, including explicit lower-level override behavior and evidence metadata.
- [x] 2.4 Extend the router-model JSON contract with `thinkingReason`, `taskComplexity`, `taskRisk`, `expectedWorkflow`, `suggestedWorkModelTier`, `parallelizable`, and `parallelizationReason`, retaining safe defaults for missing advisory fields.
- [x] 2.5 Enforce policy precedence: explicit syntax, unequivocal natural language, deterministic quality floor, semantic suggestion, then conservative fallback; ensure GPT Mini cannot directly force model switching or native Ultra.
- [x] 2.6 Run the focused policy suites and refactor duplicated level/profile constants into one auditable policy module while preserving green tests.

## 3. Work-model and execution-mode application

- [x] 3.1 Add failing integration tests proving model routing activates only for the OpenAI Codex GPT-5.6 Luna/Terra/Sol family and preserves Stratus, ZAI, Anthropic, and other external models.
- [x] 3.2 Add failing tests for successful `modelRegistry` resolution and `pi.setModel()` application, plus unavailable-model and failed-switch fallbacks that preserve the current model and warn visibly.
- [x] 3.3 Apply the selected model before thinking effort, call `pi.setThinkingLevel()`, read `pi.getThinkingLevel()`, and persist requested/effective model and level values.
- [x] 3.4 Add failing tests for model capability clamping, including warning text and requested/effective diagnostics when Pi lowers an unsupported level.
- [x] 3.5 Implement separate `standard` and `parallel-agentic` execution modes; activate bounded subagent guidance only for independent parallelizable work with active Pi subagent tools.
- [x] 3.6 Add tests proving unavailable subagent tools fall back to `standard` without changing the selected model/effort profile and without labeling local delegation as Ultra.
- [x] 3.7 Keep `native-ultra` disabled unless the Pi runtime exposes an explicit native capability; add tests proving `max` and local subagent availability do not imply native Ultra.

## 4. Router integration and observability

- [x] 4.1 Integrate original-prompt override parsing before translation, strip valid control syntax from the dispatched task, and block invalid controls with concise usage feedback.
- [x] 4.2 Replace direct `prepared.result.thinkingLevel` application in `src/index.ts` with the resolved model/effort/execution profile and confirmed effective values.
- [x] 4.3 Extend router details and status output with router suggestion, policy profile, effective model, requested/effective effort, execution mode, normalized signals, override source, clamp state, and fallback reasons.
- [x] 4.4 Preserve backward compatibility when loading historical detail entries that lack the new optional policy metadata.
- [x] 4.5 Add tests proving status and details describe decisions as quality-floor/cost-frontier choices and do not claim latency optimization without measured latency evidence.

## 5. Language and routed-turn correctness

- [x] 5.1 Add failing regression tests for `sourceLanguage: es|mixed` combined with `translateFinalAnswer: false`, including the real “respuesta con mucha variedad” case.
- [x] 5.2 Normalize Spanish and mixed turns to `translateFinalAnswer: true`, record contradictory router output, and preserve documented behavior for `en` and `unknown`.
- [x] 5.3 Add failing event-sequence tests covering commentary, reasoning-only content, tool calls, `final_answer`, phase-less text completion, and phase-less empty or unsupported content.
- [x] 5.4 Make commentary, reasoning, and tool-call events preserve the pending routed turn; consume exactly one turn only for an explicit final answer or the narrow phase-less compatibility case.
- [x] 5.5 Preserve assistant phase, timestamp, message identity, tool metadata, and non-text fields when translating visible final text or restoring English work-model context.
- [x] 5.6 Verify explicit empty/unsupported `final_answer` events complete diagnostically while phase-less empty/unsupported events remain pending for the real answer.

## 6. Evaluation, documentation, and deployment

- [x] 6.1 Add a single table-driven evaluation fixture spanning bilingual trivial, routine, bounded-complex, difficult, security, exhaustive, contextual-follow-up, explicit override, contradictory classifier, external model, clamp, and execution-mode cases.
- [x] 6.2 Encode the saved official coding cost evidence for Luna Max, Terra Max, Sol XHigh, and Sol Max as policy rationale fixtures without asserting unmeasured latency claims.
- [x] 6.3 Update Pi Router documentation and status examples for adaptive model/effort routing, explicit overrides, `parallel-agentic`, disabled native Ultra, warnings, and rollback behavior.
- [x] 6.4 Run focused tests after every TDD slice, then run `npx tsc --noEmit`, the full test suite at least five consecutive times, `git diff --check`, and `openspec validate --all --strict`.
- [ ] 6.5 Back up the active router outside extension discovery, deploy while preserving `router-state.json`, run TypeScript and the full suite against the active installation, and verify representative live prompts plus persisted detail metadata.
- [x] 6.6 Confirm `reports/` remains untouched, summarize residual risks including missing latency measurements and unavailable native Ultra, and do not push without explicit user approval.
