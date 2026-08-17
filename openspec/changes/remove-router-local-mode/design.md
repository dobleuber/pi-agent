## Context

The router has local and remote profiles. A persisted `localMode: on` selects Gemma even though GPT mini is the intended router. The local prompt also contains a concrete translation example that Gemma copied for unrelated short prompts.

## Goals / Non-Goals

**Goals:** Make routing remote-only, remove stale local controls, migrate state safely, and prevent example leakage.

**Non-Goals:** Uninstall llama.cpp or delete local GGUF files used independently.

## Decisions

1. Collapse `RouterConfig` to `state` plus one `routerModel` configured as `openai-codex/gpt-5.4-mini`.
2. Persist only `state`; legacy `localMode` is ignored on read and removed on next write.
3. Remove local lifecycle dependency and `/router local` command branches.
4. Remove few-shot messages entirely; the system prompt and required JSON schema are sufficient.
5. Add a defensive check for the legacy `Fix the tests` output when the source prompt is unrelated; safely pass through with degradation rather than dispatching invented intent.

## Risks / Trade-offs

- [Remote model unavailable] → Preserve passthrough-with-warning behavior.
- [Old state contains local mode] → Ignore it and preserve only enabled/disabled state.
- [GPT mini output format regresses without example] → Existing JSON parsing and schema tests remain, with new direct prompt tests.
