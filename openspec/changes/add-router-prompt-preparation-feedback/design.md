## Context

The router preprocesses eligible interactive input inside its asynchronous `input` event before returning transformed text to Pi. During this wait, the existing `whimsical.ts` reasoning message has not yet begun, and the router only exposes a static status entry. Pi's `ctx.ui.setWorkingMessage` only affects a loader that is already active during streaming, so it cannot provide visible feedback inside the earlier `input` event. Pi's persistent `ctx.ui.setStatus` footer API is available during input preprocessing.

## Goals / Non-Goals

**Goals:**
- Give immediate, playful feedback during initial prompt preprocessing.
- Rotate prompt-specific phrases every two seconds without consecutive repetition.
- Guarantee timer cleanup on every completion path.
- Keep the behavior deterministic under tests through injected timing and selection dependencies.

**Non-Goals:**
- Changing prompt transformation, routing, model selection, or final-answer translation.
- Changing the standalone whimsical reasoning phrase behavior.
- Persisting phrase preferences or exposing configuration UI.

## Decisions

1. Add a small prompt-specific phrase pool and a helper that selects a phrase other than the previous one. A dedicated pool communicates this distinct phase better than sharing generic reasoning phrases.
2. Set the first working message immediately, then use a two-second interval for subsequent messages. This avoids a silent initial delay while keeping rotation unobtrusive.
3. Write rotating phrases to the router's existing `pi-router` status key. Wrap only `prepareRoutedPrompt` in `try/finally`; clear the interval and restore the base router status in `finally` before Pi begins normal model work. This covers success, degraded results, and thrown errors without affecting final-answer handling.
4. Inject interval functions and phrase selection through extension dependencies. This permits deterministic lifecycle tests without real two-second delays.

## Risks / Trade-offs

- [Prompt feedback could be confused with normal reasoning] → Keep it on the router's named footer status while the whimsical extension retains ownership of the streaming working-message row.
- [Timers leak after routing errors] → Centralize cleanup in `finally` and test the rejection path.
- [A random picker repeats a phrase] → Exclude the previous phrase when more than one option exists.
- [Very fast routing causes a brief flash] → Accept the flash in exchange for immediate feedback; it also confirms that preprocessing occurred.
