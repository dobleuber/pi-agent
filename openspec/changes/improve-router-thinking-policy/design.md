## Context

Pi Router currently asks GPT Mini to return `thinkingLevel` and applies that value directly with `pi.setThinkingLevel()`. The router type accepts only `low`, `medium`, and `high`, even though Pi supports `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`, and GPT-5.6 work models can expose extended levels. This allowed an exhaustive repository review with explicit “use all your capabilities” intent to run at `low`.

An earlier router implementation still exists in `src/thinking.ts`. It combined deterministic simple/routine/high-risk patterns with the model suggestion and defaulted uncertain work to `medium`, but it is no longer connected to the extension entrypoint. Its guardrail concept is useful; its small regex vocabulary and `high` ceiling are not sufficient.

OpenAI's current guidance treats `medium` as the balanced default, `high` as appropriate for complex debugging and planning, and `xhigh` as appropriate for code review, security, deep research, challenging coding, and long-running agentic work. It describes Sol as the complex/open-ended tier, Terra as the balanced all-rounder, and Luna as the efficient tier for clear repeatable work. Community cost-efficiency guidance further suggests preferring Luna with more effort over lower-effort Terra/Sol combinations, replacing Sol Extra High with Terra Ultra, and validating these heuristics against representative workloads rather than treating them as universal truths.

The active Pi installation exposes `openai-codex/gpt-5.6-luna`, `openai-codex/gpt-5.6-terra`, and `openai-codex/gpt-5.6-sol`. The official coding cost chart places Luna Max, Terra Max, Sol XHigh, and Sol Max on the relevant high-quality cost frontier; Luna Max dominates Sol Medium, Terra Max dominates Sol High, and Luna Max dominates Terra XHigh for that benchmark. Pi clamps `setThinkingLevel()` to the selected model's capabilities and exposes the resulting value through `getThinkingLevel()`.

Pi does not expose `ultra` as a thinking level: in Codex, native Ultra is a bundled execution mode combining maximum reasoning with automatic delegation. Existing Pi subagent tools can provide a separate `parallel-agentic` mode, but that mode MUST NOT be represented as native Ultra.

The same router-model trust boundary affects two adjacent behaviors: contradictory `sourceLanguage: es|mixed` plus `translateFinalAnswer: false` is currently accepted, and intermediate assistant events can consume a pending routed turn before the real final answer arrives.

## Goals / Non-Goals

**Goals:**

- Select the work model and reasoning effort through an explainable hybrid policy instead of trusting a single model field.
- Use the compact managed-family coding frontier Luna Max → Terra Max → Sol XHigh → Sol Max, while retaining evaluation gates for future changes.
- Support Pi's complete thinking-level vocabulary.
- Use `medium` as the conservative automatic default, `high` for complex work, and `xhigh` for qualifying exhaustive/high-value workflows.
- Use Luna Max and Terra Max automatically as cost-efficient managed-family profiles; reserve Sol Max for explicit maximum-quality intent.
- Distinguish `standard`, Pi `parallel-agentic`, and official `native-ultra` execution modes; never label local subagent guidance as native Ultra.
- Support deterministic `@thinking:<level>` controls and unequivocal natural-language overrides in English and Spanish.
- Allow automatic policy to override the current Shift+Tab selection when no prompt-level override exists.
- Apply Pi's model-capability clamp, detect requested/effective differences, warn, and persist the reason.
- Enforce Spanish final translation locally for Spanish and mixed source prompts.
- Complete pending turns only on final-answer events while preserving intermediate reasoning/commentary events.
- Provide a reusable evaluation matrix for policy regressions.

**Non-Goals:**

- Routing to providers or model families outside the enabled OpenAI Codex GPT-5.6 Luna/Terra/Sol set.
- Implementing a new subagent runtime or claiming that existing Pi subagent guidance is equivalent to OpenAI native Ultra.
- Adding another LLM call solely to validate model or thinking selection.
- Automatically selecting `max` for any task.
- Estimating exact token cost or latency before execution.
- Building a general-purpose semantic router outside Pi Router.
- Treating informal third-party model/effort heuristics as permanent facts without evaluation data.
- Exposing or storing hidden chain-of-thought.

## Decisions

### 1. Use a hybrid policy with explicit precedence

The selector will resolve levels in this order:

1. Parse a prompt-level explicit override.
2. Compute deterministic complexity/risk/depth floors from the original prompt and available conversation summary.
3. Normalize GPT Mini's semantic classification and supporting fields.
4. Resolve automatic effort using the local floor, model suggestion, and conservative defaults.
5. Apply the requested level through Pi, read back the effective level, and record any clamp.

An explicit override is binding except for model-capability clamping. Without an explicit override, the router is dominant and may raise or lower the prior Shift+Tab selection.

Alternative considered: model-only classification. Rejected because the current failure demonstrates that prompt instructions do not enforce policy. Alternative considered: deterministic-only classification. Rejected because contextual follow-ups and indirect intent need semantic understanding.

### 2. Route a model-and-effort work profile

The policy output will be a `WorkProfileDecision`, not only a thinking level. It contains the selected provider/model, requested thinking level, optional execution mode, reason, and normalized signals.

The initial managed-family profile matrix is intentionally small and evaluation-driven:

| Task profile | Requested work profile | Coding cost evidence |
|---|---|---|
| routine, clear, or mechanical agentic work | Luna Max | score 74.6 at approximately $537 in the saved official coding chart |
| complex but bounded coding work | Terra Max | score 77.4 at approximately $942; dominates Sol High on score and cost |
| difficult debugging, architecture, deep review, security, or high-value work | Sol XHigh | score 78.7; next high-quality frontier point after Terra Max |
| explicit maximum-quality request | Sol Max | score 80.0; highest single-agent point in the chart |
| explicit native Ultra request with real runtime support | Sol native Ultra | official multi-agent execution, not a thinking-level alias |

The initial table excludes Luna Low/Medium because this coding agent intentionally maintains a higher quality floor, even though those points remain useful for cost-minimal workloads. It also excludes Terra XHigh, Sol Medium, and Sol High because the saved coding cost chart shows them dominated by Luna Max or Terra Max. This is benchmark-specific policy rather than a universal model truth; profile thresholds remain centralized and evaluation-covered so later cost, quality, and latency evidence can replace them without rewriting event flow.

Execution mode is resolved independently:

- `standard` performs a normal single-agent run;
- `parallel-agentic` adds bounded guidance asking the work model to delegate only independent work through existing Pi subagent tools;
- `native-ultra` is selected only when the Pi runtime explicitly exposes OpenAI native Ultra and the user or policy is permitted to request it.

`parallel-agentic` MUST NOT be called Ultra. If subagent tools are unavailable, it falls back to `standard` on the already selected model/effort profile and records a warning. Native Ultra availability is not inferred from `max` or from the presence of local subagent tools.

Model routing activates only when the current work model already belongs to the `openai-codex/gpt-5.6-luna|terra|sol` family. A manually selected Stratus, ZAI, Anthropic, or other model is preserved; in that case the policy adjusts only thinking effort and records `modelRouting: "preserved-external"`.

When family routing is active, the extension resolves the target model through `ctx.modelRegistry`, calls `pi.setModel()`, and confirms the resulting context model before applying the thinking level. If the preferred model is unavailable or switching fails, it keeps the current model, clamps effort through Pi, warns, and records the fallback instead of silently dispatching with an unintended profile.

Alternative considered: always use Sol and tune effort only. Rejected because it ignores the approved cost-efficiency goal. Alternative considered: directly launch subagents from the extension. Rejected because that couples routing to orchestration and duplicates existing Pi tooling.

### 3. Represent the full Pi level vocabulary

The shared thinking type will include `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max`. Ordering will be centralized in one rank table rather than repeated conditionals.

GPT Mini's advisory thinking suggestion may automatically contribute only `low`, `medium`, `high`, or `xhigh`; an advisory `max` is capped to `xhigh` and recorded as a policy correction. The deterministic managed-family profile resolver may nevertheless select Luna Max or Terra Max automatically because those are approved cost-frontier profiles. Sol Max and direct external-model `max` remain explicit.

### 4. Make `low` difficult to select accidentally

`medium` is the conservative semantic-complexity default and the effort default for preserved external models. Automatic `low` requires both an unambiguous local simple/low-risk signal and a compatible semantic classification. Managed-family coding profiles use Luna Max as their minimum automatic profile; explicit overrides can still request lower levels.

Automatic floors:

- `medium`: ordinary implementation, maintenance, documentation, tool use, or uncertain intent.
- `high`: difficult debugging, multi-file refactoring, architecture/design, migrations, performance, destructive operations, high ambiguity, or complex planning.
- `xhigh`: code review, security analysis, exhaustive repository review, deep external research, challenging long-horizon coding, or equivalent high-value workflows.

A floor may raise the model suggestion but cannot be lowered by it.

### 5. Parse explicit controls before prompt translation

`@thinking:<level>` will be parsed from the original prompt before routing. The directive is control metadata and will be removed from the task dispatched to the work model. Invalid levels produce concise usage feedback and do not dispatch.

Natural-language overrides remain part of the task text. Only unequivocal phrases are binding, including English and Spanish equivalents of maximum reasoning, all capabilities, maximum effort, and explicit named levels. If syntax and natural language conflict, `@thinking:<level>` wins and the conflict is recorded.

Within the managed GPT-5.6 family, “use all your capabilities” maps to Sol Max. “Exhaustive/deep review” without maximum wording contributes the Sol XHigh quality floor rather than Sol Max. Explicit named lower levels remain binding and select a compatible family model.

### 6. Expand the router classification contract

GPT Mini will return:

- `thinkingLevel`;
- `thinkingReason`;
- `taskComplexity`;
- `taskRisk`;
- `expectedWorkflow`;
- `suggestedWorkModelTier` (`luna`, `terra`, or `sol`);
- `parallelizable` and a short `parallelizationReason`.

The local policy treats these values as advisory. GPT Mini cannot directly request Ultra or force a model switch. Missing or invalid fields fall back safely without blocking translation. Conversation context may inform semantic classification for follow-ups such as “review it again,” but explicit controls and protected prompt content remain derived from the latest original prompt.

### 7. Let Pi perform capability clamping

After resolving and applying the selected enabled model, the extension will call `pi.setThinkingLevel(requested)` and immediately read `pi.getThinkingLevel()` as the effective level. Pi remains the source of truth for model capability maps and holes; Pi Router hard-codes only the approved Luna/Terra/Sol profile IDs, not provider-specific effort maps.

If requested and effective differ, Pi Router will show a brief warning and persist both values plus `thinkingWasClamped: true`. This also handles models that expose `high` and `max` but not `xhigh`.

Alternative considered: inspect provider/model IDs and maintain a router-owned support table. Rejected because it would become stale and diverge from Pi.

### 8. Persist explainable decision metadata

Router details will distinguish:

- router model-tier suggestion;
- policy-selected and effective work model;
- policy-selected/requested level;
- effective level;
- execution mode (`standard` or `ultra`);
- model-selection and thinking reasons;
- normalized signals;
- explicit-override status and source;
- model fallback and effort-clamp status.

No hidden reasoning text is stored. Reasons are short policy explanations suitable for `/router details` and tests.

### 9. Enforce the language invariant locally

After normalizing `sourceLanguage`, `translateFinalAnswer` is forced to `true` for `es` and `mixed`. A contradictory model boolean is ignored and recorded as a normalization event. English behavior remains controlled by the normalized contract, and `unknown` uses the model value with a conservative fallback.

This rule is deterministic and requires no repair or validation call.

### 10. Finalize turns by assistant phase

When assistant messages expose a phase:

- `commentary` and reasoning/intermediate phases never consume a pending turn;
- `final_answer` may consume, complete, and translate it;
- tool-call messages remain intermediate.

For providers or historical messages without phase metadata, the extension retains a compatibility fallback: only a non-tool assistant event with supported final text may complete the turn. Empty or unsupported terminal events are completed only when they are explicitly marked `final_answer`; otherwise they remain pending for the actual answer.

Returned assistant messages preserve their original phase and other metadata when visible text is replaced.

### 11. Evaluate policy as a matrix

Tests will use table-driven cases spanning English and Spanish, direct and contextual prompts, explicit and automatic levels, contradictory router suggestions, work-model clamps, and assistant phases. Required regression cases include:

- routine managed-family coding selects Luna Max even when GPT Mini suggests a lower effort;
- complex bounded coding selects Terra Max;
- exhaustive implementation review plus web best-practice research selects Sol XHigh even when GPT Mini suggests `low`;
- “use all your capabilities” selects Sol Max;
- `parallel-agentic` guidance requests subagents only for independent work and is never labeled native Ultra;
- native Sol Ultra is unavailable unless the Pi runtime explicitly exposes it;
- preserved external models use the adaptive thinking policy without family model switching;
- trivial requests may select `low` only with aligned signals;
- Spanish plus `translateFinalAnswer: false` still translates;
- commentary/reasoning events do not consume the pending turn;
- the subsequent `final_answer` completes and translates exactly once.

## Risks / Trade-offs

- **[Heuristic vocabulary becomes brittle]** → Keep local patterns limited to explicit controls and safety/quality floors; use semantic classification for broader intent and cover behavior with a bilingual evaluation matrix.
- **[Higher effort or a stronger model increases latency and cost]** → Use the compact Luna Max → Terra Max → Sol XHigh → Sol Max coding frontier, reserve Sol Max for explicit maximum intent, and persist reasons so decisions can be tuned from evidence.
- **[Natural-language override false positive]** → Require unequivocal phrases, let explicit syntax win, and test quoted/example text so merely discussing “max” does not activate it.
- **[Model switching or Pi clamp occurs after status preparation]** → Resolve and apply the model first, then set/read the effective level, and update status/details only from confirmed effective values.
- **[Missing assistant phase on some providers]** → Retain a narrow legacy fallback while preferring explicit phase semantics whenever present.
- **[Context summary biases the floor]** → Use context only for semantic classification and contextual continuation, not for explicit override parsing.
- **[Policy and prompt drift apart]** → Centralize approved work profiles, levels, ordering, normalization, and resolution in the policy module; generate router prompt wording from the same documented contract where practical.
- **[Third-party model heuristics age poorly]** → Treat the initial Luna/Terra/Sol matrix as an evaluated policy table, record profile outcomes, and revise thresholds without changing event architecture.
- **[Parallel-agentic guidance causes unnecessary fan-out]** → Require a positive parallelizability decision and independent work units before adding delegation guidance; otherwise use standard execution.
- **[Subagent tools are unavailable]** → Keep the selected model/effort profile, fall back from `parallel-agentic` to `standard`, show a warning, and persist the execution-mode fallback.
- **[Saved chart lacks materialized latency data]** → Treat the initial profile table as quality/cost optimized, measure live latency before adding latency-based profile rules, and avoid claiming that Luna Max minimizes wall-clock time.

## Migration Plan

1. Add failing table-driven tests for level parsing, selection, clamping, diagnostics, language invariants, and assistant phases.
2. Expand the shared thinking type and replace the disconnected `thinking.ts` policy with a model-and-effort profile resolver.
3. Extend the router JSON contract with advisory model tier and parallelizability fields while retaining compatibility with missing advisory fields.
4. Resolve and apply the selected enabled Luna/Terra/Sol model, then apply requested effort through Pi and record effective results.
5. Enforce source-language translation and phase-aware finalization.
6. Deploy to the active extension with router state preserved.
7. Verify TypeScript, the full suite repeatedly, OpenSpec, representative live prompts, and persisted router details.

Rollback is a file-level restore from the external router backup. Existing persisted details remain readable because all new diagnostic fields are optional; legacy entries require no migration.

## Open Questions

- The saved official chart materializes cost but not the alternate latency dataset. Live Luna Max, Terra Max, Sol XHigh, and Sol Max latency measurements are required before adding latency-sensitive routing thresholds.
- Pi currently exposes thinking through `max` but not native Ultra. Native Sol Ultra remains disabled until a runtime API can positively identify and activate it.
- Pi's runtime types expose clamping through `setThinkingLevel()` plus `getThinkingLevel()`, but do not expose a direct list of supported levels to extensions. The implementation should confirm that immediate read-back is reliable for every configured provider.
- The exact assistant `phase` shape should be verified against the installed Pi event types and a live GPT-5.6 session before implementation; compatibility fallback behavior must remain covered if phase is absent.
