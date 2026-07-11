## Why

When the Pi router preprocesses an initial user prompt, the prompt temporarily disappears without distinct feedback about that preprocessing phase. A lightweight, playful working message will make the delay feel intentional while distinguishing prompt preparation from normal model reasoning and final-answer processing.

## What Changes

- Show a prompt-preparation-specific working message while the enabled router preprocesses an eligible initial user prompt.
- Select messages from a dedicated set of playful prompt-related phrases rather than reusing the general reasoning phrases.
- Rotate the working message every two seconds without repeating the same phrase consecutively.
- Stop rotation and clear the router-owned working message after preprocessing succeeds, fails, degrades, or is otherwise completed.
- Leave final-answer translation feedback and normal reasoning behavior unchanged.

## Capabilities

### New Capabilities

- `router-prompt-preparation-feedback`: Defines visible, rotating working feedback and lifecycle cleanup while the router preprocesses an initial prompt.

### Modified Capabilities

None.

## Impact

- Affects the Pi router input-event lifecycle and its tests under `.pi/agent/extensions/pi-router/`.
- Uses Pi's existing working-message UI API; no external dependencies or public APIs are added.
- Does not change routing decisions, prompt contents, model selection, final-answer translation, or the standalone whimsical reasoning extension.
