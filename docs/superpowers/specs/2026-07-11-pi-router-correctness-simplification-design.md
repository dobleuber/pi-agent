# Pi Router Correctness and Simplification Design

## Goal

Make every routed turn complete deterministically, restore English model context without ambiguous text matching, prevent protected-content corruption during translation repair, and remove obsolete HTTP/local-model abstractions now that Pi Router exclusively uses `openai-codex/gpt-5.4-mini` through Pi AI.

## Architecture

### Deterministic turn completion

Every `PendingRoutedTurn` receives a stable `turnId`. The pre-dispatch and completed detail entries carry this identifier. Every consumed pending turn produces a completed detail entry, including turns whose final answer does not require translation, empty answers, and unsupported assistant content. When translation is unnecessary, the original answer is recorded as both `englishAnswer` and `spanishAnswer`.

### Deterministic context restoration

Completed details associate English and visible answers with their routed turn. Context restoration processes completed router details in branch order and restores only unambiguous matching assistant messages. New entries use `turnId` and message-position metadata where the Pi event API exposes it. Legacy entries without identifiers use text matching only when exactly one candidate detail and one candidate assistant message exist; ambiguous duplicate visible answers remain unchanged rather than risking incorrect replacement.

### Unified placeholder integrity

A shared placeholder-integrity helper extracts normalized multisets for inline-code placeholders, protected spans such as `§P0§`, and preserved fenced-block placeholders. Both normal translation and residual-English repair must preserve the complete multiset. Missing, duplicated, malformed, or substituted placeholders cause bounded fallback to the original chunk or full English answer with a degradation warning.

### Pi AI-only transport

Production routing and final-answer translation always call `completeWithPiRouterModel()`. Remove the direct `/chat/completions` transport, `shouldUsePiAi()`, `baseUrl`, llama-specific stop tokens, and HTTP test models. `RouterModelConfig` retains provider, model, timeout, fallback policy, and maximum input length. Tests inject `modelRegistry` and `complete` through `PiAiRuntime`.

### Local fidelity validation

Keep the explicit regression guard for leaked `Fix the tests` output. Add deterministic validation for protected tokens and extreme structural collapse. The validator does not make another model call and does not attempt semantic equivalence. If required commands, paths, quoted strings, placeholders, or substantial multiline structure disappear, Pi Router passes through the original prompt with a degradation warning.

## Data Flow

1. Input routing creates `turnId`, transforms the prompt through GPT Mini, and persists pre-dispatch details.
2. The final assistant event consumes the matching pending turn.
3. If translation is disabled, the answer is recorded unchanged and the detail is completed.
4. If translation is enabled, protected spans are masked, translated through Pi AI, validated, optionally repaired once, restored, and persisted.
5. During `context`, completed details are matched deterministically to visible assistant messages. Ambiguous legacy matches are ignored.

## Error Handling

- Router/model failures preserve the original prompt according to `fallbackMode`.
- Empty or unsupported final answers produce completed diagnostic entries rather than dangling pre-dispatch entries.
- Placeholder mismatch rejects the model output and preserves original content.
- Ambiguous historical matches preserve visible messages unchanged.
- No repair path performs more than one additional model call per completed answer.

## Testing

Use test-driven development for:

- untranslated, empty, and unsupported final-answer completion;
- duplicate Spanish answers and truncated/ambiguous history;
- missing and duplicated protected/fenced placeholders in normal and repair output;
- Pi AI-only routing and translation with no HTTP fallback;
- fidelity fallback for lost commands, paths, quoted strings, and severe structural collapse;
- migration compatibility for existing completed details.

Verification includes TypeScript compilation, the full Node test suite, repeated test runs, `git diff --check`, and strict OpenSpec validation.

## Scope

This change does not alter the selected work model, user-facing Spanish policy, standalone llama.cpp installation, or the one-repair-call limit. It does not add semantic similarity services or additional model validation calls.
