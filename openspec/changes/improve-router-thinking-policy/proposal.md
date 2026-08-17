## Why

Pi Router currently trusts GPT Mini's `thinkingLevel` field without a deterministic policy, supports only `low`, `medium`, and `high`, and can select `low` for exhaustive repository review even when the user explicitly requests maximum capability. The same trust-without-validation pattern has also allowed Spanish turns to skip final translation and intermediate assistant events to consume pending routed turns, so the routing contract needs enforceable local policy rather than prompt-only guidance.

## What Changes

- Introduce a hybrid work-policy router combining explicit user overrides, deterministic complexity/risk floors, GPT Mini semantic classification, a conservative `medium` default, adaptive work-model selection, and capability clamping.
- Select a cost/quality-appropriate combination of `openai-codex/gpt-5.6-luna`, `openai-codex/gpt-5.6-terra`, or `openai-codex/gpt-5.6-sol` plus reasoning effort when the active work model already belongs to that family.
- Use a compact evaluation-backed coding frontier for managed-family routing: Luna Max for routine/clear work, Terra Max for complex bounded work, Sol XHigh for difficult high-value work, and Sol Max for explicit maximum-quality requests.
- Exclude dominated managed-family combinations such as Terra XHigh, Sol Medium, and Sol High from the initial automatic profile table while retaining evaluation tests so the table can evolve with evidence.
- Keep native Sol Ultra distinct from Pi subagent orchestration: use `native-ultra` only when Pi exposes it, and use `parallel-agentic` for bounded delegation through existing Pi subagent tools.
- Support Pi's full thinking vocabulary: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`.
- Reserve automatic `xhigh` for code review, security, difficult debugging, architecture analysis, exhaustive review, deep research, and long-running agentic workflows.
- Reserve `max` for explicit syntax or unequivocal natural-language requests such as “use maximum reasoning” or “use all your capabilities.”
- Support explicit `@thinking:<level>` overrides, with explicit overrides taking precedence over automatic classification.
- Allow the router to dominate the manually selected Shift+Tab level when no prompt-level override is present, while preserving manually selected work models outside the OpenAI Codex GPT-5.6 Luna/Terra/Sol family.
- Resolve requested levels against capabilities exposed by the active work model; clamp unsupported levels downward, warn the user, and record requested/effective levels and reasons.
- Enforce locally that Spanish and mixed-language prompts require visible Spanish final answers, regardless of an inconsistent router-model boolean.
- Complete routed turns only from actual final-answer assistant events; preserve commentary/reasoning phases and do not consume pending turns for intermediate events.
- Add an evaluation matrix covering trivial, routine, complex, high-risk, exhaustive, explicit-maximum, unsupported-level, contradictory-classifier, translated-prompt, and contextual-follow-up cases.

## Capabilities

### New Capabilities

- `router-adaptive-thinking-policy`: Defines supported levels, explicit overrides, automatic selection, hybrid policy precedence, model-capability clamping, diagnostics, and evaluation behavior.
- `router-adaptive-model-policy`: Defines the Luna Max, Terra Max, Sol XHigh, Sol Max, and native Sol Ultra quality/cost frontier, fallback behavior, and separate Pi `parallel-agentic` execution mode.
- `router-turn-finalization`: Defines which assistant phases can complete a routed turn and how intermediate reasoning/commentary events are preserved.

### Modified Capabilities

- `router-final-answer-translation`: Requires Spanish or mixed source-language turns to translate visible final answers even when router-model output contains a contradictory translation flag.

## Impact

- Affects Pi Router's model-output schema, thinking-level types, prompt parsing, policy resolution, work-model selection and capability inspection, subagent execution guidance, status/details metadata, final-answer lifecycle, and tests.
- Reconnects and replaces the currently unused deterministic policy in `src/thinking.ts` with an explainable hybrid selector rather than relying on brittle keyword-only routing.
- Uses Pi's existing model registry, `setModel()`, `setThinkingLevel()`, and supported-level clamping behavior; no additional model call is introduced.
- Changes observable routing decisions: clear/routine managed-family work uses Luna Max, complex bounded work uses Terra Max, difficult high-value work uses Sol XHigh, explicit maximum requests use Sol Max, and native Sol Ultra remains distinct from local `parallel-agentic` orchestration.
