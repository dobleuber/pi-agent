## Context

The `pi-router` extension currently keeps one mutable `RouterConfig` object in `.pi/agent/extensions/pi-router/src/index.ts`. That config contains the router enabled state and a single `routerModel` profile. The default profile is local `llama-cpp/gemma4` at `http://127.0.0.1:11434/v1`.

Routing and final-answer translation both receive `config.routerModel`, so changing the active router model profile in one place is enough to route both prompt translation and final-answer translation through the selected backend.

The user wants `/router on|off` to keep meaning only “enable or disable routing”, and wants a separate `/router local on|off` control for local llama.cpp usage. The local llama.cpp setup uses distinct ports per model, so stopping the local router model server by port is acceptable.

## Goals / Non-Goals

**Goals:**

- Add persistent local-mode state to the router extension.
- Resolve the active router model from local-mode state.
- Add `/router local on` and `/router local off` commands.
- Start the local Gemma llama.cpp server when switching local mode on and the endpoint is down.
- Stop the local Gemma llama.cpp server when switching local mode off.
- Include local-mode state in status output.
- Keep existing routing fallback behavior unchanged.

**Non-Goals:**

- Do not change the work model selected for normal coding responses.
- Do not change the work model selected for normal coding responses when the router switches between local and remote modes.
- Do not create a generic multi-model router profile UI beyond the requested local on/off toggle.
- Do not change the router prompt, JSON parsing, or translation policy.

## Decisions

### Decision: Represent local mode separately from router enabled state

Add a `RouterLocalMode` state, likely `"on" | "off"`, alongside the existing `RouterState`. Keep `/router on|off` mapped only to `RouterState` and `/router local on|off` mapped only to `RouterLocalMode`.

Alternative considered: make `/router off` imply remote mode. This was rejected because it mixes two independent concepts: whether routing runs and whether routing uses local llama.cpp.

### Decision: Store profiles in config and derive the active router model

Extend router configuration to hold named local and remote profiles, then derive the active `routerModel` from local mode. A small helper such as `resolveRouterModel(config)` can keep call sites simple and avoid duplicating conditional logic.

The local profile is `llama-cpp/gemma4` at `http://127.0.0.1:11434/v1`. The remote profile is `openai-codex/gpt-5.4-nano` at `https://chatgpt.com/backend-api`.

Alternative considered: mutate and persist a full `routerModel` object each time the user toggles. This was rejected because local mode is the user-level state; profiles should remain declarative defaults that tests can validate.

### Decision: Persist local mode with existing router state persistence

Extend the existing file-backed router state store or add a companion store method so both enabled state and local mode survive Pi restarts. The implementation should remain backward compatible with existing persisted state files that only contain the router enabled state.

Alternative considered: keep local mode session-only. This was rejected because the user explicitly wants a local command that controls whether llama.cpp is used, and needing to re-toggle every session would be surprising.

### Decision: Introduce a small lifecycle helper for llama.cpp

Add a helper module for local server lifecycle operations rather than embedding process logic in the command handler. The helper should expose operations equivalent to:

- check whether the configured endpoint responds, using `/models` under the local profile base URL;
- start the configured wrapper command detached;
- stop the process bound to the configured local profile port.

This keeps command handling testable by injecting a fake lifecycle dependency in extension tests.

Alternative considered: inline `fetch`, `spawn`, and stop-command logic directly inside `index.ts`. This was rejected because it would make `/router` command tests harder to isolate.

### Decision: Stop by configured local profile port

When switching local mode off, stop the process serving the configured local profile port. The user clarified that llama.cpp uses different ports for each model, so stopping by port is not expected to kill unrelated models.

Alternative considered: only stop processes started by this extension. This was rejected because it would fail to turn off a manually started local router server, which is not what the user wants.

### Decision: Use GPT-5.4 Nano as the remote router model

Use `openai-codex/gpt-5.4-nano` for remote mode so the router uses the user's ChatGPT/OpenAI Codex subscription rather than OpenRouter or a direct OpenAI API key. The router task is translation, language classification, thinking-level selection, and small JSON output. Nano is sufficient for this expected workload.

The installed Pi catalog currently exposes `openai-codex/gpt-5.4-mini` but may not expose `openai-codex/gpt-5.4-nano` yet. Keep Nano as the configured target and allow an operational fallback to `gpt-5.4-mini` when Nano is not present in `ctx.modelRegistry`, so remote mode keeps working until the Codex catalog includes Nano.

Alternative considered: use `openai/gpt-5.4-nano` at `api.openai.com`. This was rejected because it requires an OpenAI API key instead of the user's normal ChatGPT subscription.

## Risks / Trade-offs

- Local server startup may take longer than the command handler should block → Start the wrapper and notify the user; routing fallback behavior still handles temporary unavailability.
- Port-based stop may fail if platform tools are unavailable → Keep remote mode selected and show a warning so routing does not continue to depend on llama.cpp.
- Existing persisted state may have the old shape → Read old state defensively and default local mode to `on` when absent.
- Remote mode depends on OpenAI Codex authentication and availability → Preserve existing passthrough-with-warning behavior when selected remote routing is unavailable.
- The installed OpenAI Codex model catalog may not expose GPT-5.4 Nano yet → Keep Nano as the configured target and fall back to Codex Mini only when Nano is absent from the registry.

## Migration Plan

1. Add the new config/state types and defaults while preserving the existing default behavior: routing remains off by default and local mode defaults to on.
2. Update state loading to accept old persisted router state files.
3. Add command behavior and lifecycle helper tests before implementation.
4. Implement `/router local on|off` and status changes.
5. Run the pi-router test suite.

Rollback is straightforward: revert the change. Existing old-style state files remain valid; new local-mode state can be ignored by older code if stored in an additive object shape.

## Open Questions

None. The user confirmed that stopping llama.cpp by configured model port is acceptable because each model uses a distinct port.
