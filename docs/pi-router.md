# Pi Router adaptive work policy

Pi Router translates routed prompts and selects an auditable model/effort profile. When the active work model is already in the OpenAI Codex GPT-5.6 managed family, automatic coding routes use the evaluated quality/cost frontier:

- routine or clear work: **Luna Max**;
- bounded complex work: **Terra Max**;
- difficult debugging, architecture, security, deep research, or exhaustive review: **Sol XHigh**;
- explicit maximum-quality intent: **Sol Max**.

Other providers and model families are preserved. Their reasoning effort still follows the adaptive policy: aligned trivial work may use `low`, uncertainty defaults to `medium`, complex work floors at `high`, and exhaustive/high-value work floors at `xhigh`.

## Explicit controls

Prefix a prompt with `@thinking:off|minimal|low|medium|high|xhigh|max`. The directive is removed before dispatch and overrides automatic classification, subject to Pi's model capability clamp. Unequivocal English and Spanish requests such as “use maximum reasoning” or “usa todas tus capacidades” are also binding. Invalid directives are not dispatched.

## Execution modes and warnings

`standard` is single-agent execution. `parallel-agentic` adds bounded delegation guidance only when the router identifies independent work and Pi subagent tools are active. This is not OpenAI native Ultra. `native-ultra` remains disabled until Pi exposes an explicit native capability; neither `max` nor local subagents imply it.

If a target model is unavailable, switching fails, subagent tools are unavailable, or Pi clamps effort, the current model/profile is retained as far as possible and the warning is recorded in router details. Details include advisory and requested effort, effective model and effort, normalized policy signals, execution mode, override source, clamp state, and fallback reasons. Frontier explanations describe quality floors and cost evidence, not unmeasured latency.

Spanish and mixed-language turns always translate visible final answers. Commentary, reasoning, and tool events remain intermediate; only `final_answer` (or a narrow phase-less text compatibility event) completes a routed turn.

## Rollback

Restore the prior extension files and restart Pi. New detail fields are optional, so historical entries require no state migration. Preserve `router-state.json` when replacing extension code.
