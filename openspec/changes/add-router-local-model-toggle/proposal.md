## Why

The Pi router currently uses the local llama.cpp Gemma router model whenever routing is enabled, which forces the user to keep llama.cpp running even when they want remote-only routing. The router needs a separate local-model toggle so `/router on|off` controls routing itself while `/router local on|off` controls whether the router uses and manages the local llama.cpp server.

## What Changes

- Add a persistent local-model mode for the router.
- Keep `/router on` and `/router off` limited to enabling and disabling routing.
- Add `/router local on` to select the local `llama-cpp/gemma4` router model and start the configured llama.cpp server when it is down.
- Add `/router local off` to select the remote `openai-codex/gpt-5.4-mini` router model and stop the configured local llama.cpp server.
- Include local-mode state in router status output.
- Preserve existing routing fallback behavior when the selected router model is unavailable.

## Capabilities

### New Capabilities
- `router-local-model-toggle`: Router local-mode selection, status reporting, and local llama.cpp lifecycle control.

### Modified Capabilities

## Impact

- Affected extension code: `.pi/agent/extensions/pi-router/src/config.ts`, `.pi/agent/extensions/pi-router/src/index.ts`, and any new helper module needed for local llama.cpp lifecycle management.
- Affected tests: `.pi/agent/extensions/pi-router/tests/config.test.ts`, `.pi/agent/extensions/pi-router/tests/extension.test.ts`, and new tests for lifecycle helper behavior if introduced.
- Runtime dependency: the user's configured `~/.local/bin/llama-gemma4-server` wrapper and the local model endpoint at `http://127.0.0.1:11434/v1`.
- Remote routing dependency: OpenAI Codex subscription model `openai-codex/gpt-5.4-mini` at `https://chatgpt.com/backend-api`, resolved via Pi's `ctx.modelRegistry`/OAuth auth rather than OpenRouter or direct OpenAI API-key calls.
