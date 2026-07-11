## Why

Pi Router is intended to use the OpenAI Codex GPT mini profile, but persisted `localMode: on` continued routing through a stale local Gemma model. That model copied a few-shot example and replaced unrelated user intent with `Fix the tests`.

## What Changes

- Remove local router model profiles, local-mode state, commands, and lifecycle management.
- Make `openai-codex/gpt-5.4-mini` the sole router and translation model.
- Ignore legacy persisted `localMode` fields while preserving router enabled/disabled state.
- Remove the concrete `Arregla los tests → Fix the tests` few-shot example.
- Reject or safely pass through any leaked legacy-example output.

## Capabilities

### New Capabilities

- `router-remote-only-model`: Defines a single remote GPT mini routing path and legacy-state migration.
- `router-example-leakage-guard`: Prevents a demonstration output from replacing unrelated prompt intent.

### Modified Capabilities

- `router-local-model-toggle`: Removes local-mode selection, lifecycle, persistence, and commands in favor of the sole remote model.

## Impact

- Removes Pi Router's llama.cpp lifecycle and `/router local` controls.
- Affects router configuration, state persistence, prompt construction, tests, and recovery documentation.
- Does not uninstall standalone llama.cpp models used outside Pi Router.
