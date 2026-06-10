# Router Local Model Toggle Design

## Goal

Add a local-model toggle to the `pi-router` extension so the router can switch between the local llama.cpp Gemma router model and a remote GPT-5.4 Nano router model. This lets the user avoid running llama.cpp when local routing is not desired while keeping `/router on|off` focused on enabling or disabling routing.

## Current behavior

The router extension lives in `.pi/agent/extensions/pi-router`. Its default `routerModel` is hardcoded to `llama-cpp/gemma4` at `http://127.0.0.1:11434/v1`. The `/router` command currently supports status, `on`, and `off`. Both prompt routing and final-answer translation use `config.routerModel`.

## Commands

Keep the existing router state commands unchanged:

- `/router on` enables routing.
- `/router off` disables routing.
- `/router` shows status.

Add local model commands:

- `/router local on`
  - Selects local routing with `llama-cpp/gemma4`.
  - Starts the configured llama.cpp server if it is not already responding.
- `/router local off`
  - Selects remote routing with `openrouter/openai/gpt-5.4-nano`.
  - Stops the configured local llama.cpp server.

## Router model profiles

Define two router model profiles:

### Local profile

```ts
{
  provider: "llama-cpp",
  model: "gemma4",
  baseUrl: "http://127.0.0.1:11434/v1",
  timeoutMs: 15000,
  fallbackMode: "passthrough-with-warning",
  maxInputChars: 12000
}
```

### Remote profile

```ts
{
  provider: "openrouter",
  model: "openai/gpt-5.4-nano",
  baseUrl: "https://openrouter.ai/api/v1",
  timeoutMs: 15000,
  fallbackMode: "passthrough-with-warning",
  maxInputChars: 12000
}
```

GPT-5.4 Nano is preferred over GPT-5.4 Mini because this router only performs translation, classification, and JSON extraction. Pi's generated model catalog lists GPT-5.4 Nano as cheaper than Mini, and the task does not need Mini's extra quality unless future testing shows Nano is insufficient.

## Local process lifecycle

The implementation should use the user's llama.cpp wrapper conventions:

- Local server wrapper: `~/.local/bin/llama-gemma4-server`
- Local API health endpoint: `http://127.0.0.1:11434/v1/models`

`/router local on` should:

1. Switch the active router model profile to the local profile.
2. Check whether the local endpoint responds.
3. If it does not respond, launch `~/.local/bin/llama-gemma4-server` detached.
4. Notify the user whether local routing is selected and whether the server was already running or started.

`/router local off` should:

1. Switch the active router model profile to the remote profile.
2. Stop the llama.cpp server for the local model/port.
3. Notify the user that remote routing is selected.

Because the user's llama.cpp setup uses distinct ports for each model, stopping the server on the configured local router port is acceptable and does not risk killing unrelated models.

## Persistence and status

Persist the local-mode selection so it survives future Pi sessions, similar to the existing router on/off state.

Status should include both router state and local mode, for example:

```text
router:on local:on routerModel:llama-cpp/gemma4 workModel:openai-codex/gpt-5.5
```

or:

```text
router:on local:off routerModel:openrouter/openai/gpt-5.4-nano workModel:openai-codex/gpt-5.5
```

## Error handling

- If starting llama.cpp fails, keep the local profile selected but notify the user with a warning. Existing routing fallback behavior will still pass through if the model is unavailable.
- If stopping llama.cpp fails, keep the remote profile selected and notify the user with a warning.
- `/router local` without `on` or `off` should show the current local-mode status and accepted usage.
- Unknown `/router` subcommands should continue to show status or a concise usage message.

## Testing

Add tests for:

- Default config includes both local and remote profiles, with local mode enabled by default.
- Status summaries include `local:on` or `local:off`.
- `/router local off` switches to the remote profile and requests local server shutdown.
- `/router local on` switches to the local profile and requests local server startup if health check fails.
- Existing `/router on|off` behavior remains unchanged.
- Prompt routing uses the currently selected router model profile.
