## Context

The translator processes prose in small sequential segments. Failed short segments are currently restored in English, and modified English such as `eenough` evades exact-equality checks. In one observed session, 12 of 17 answers had fallbacks and 15 English prose fragments remained outside code.

## Goals / Non-Goals

**Goals:** Detect residual English, repair it with one bounded request, preserve code, and prevent silent mixed-language output.

**Non-Goals:** Translate fenced code blocks, add a language-detection dependency, or retry each failed fragment independently.

## Decisions

1. Apply a conservative English-function-word score to the assembled masked answer, excluding protected code and identifiers.
2. If residual English exists, send the assembled answer through one repair prompt: preserve Spanish and structure, translate only remaining English.
3. Reuse cleanup and placeholder validation, then require the repaired output to pass residual-English validation.
4. If repair fails, show the coherent original English answer and emit degradation details instead of mixing languages.
5. Do not repair clean answers, keeping normal-path latency unchanged.

## Risks / Trade-offs

- [Repair request is slower] → Permit only one additional call and only after local detection.
- [Technical English triggers detection] → Protected code/identifiers are masked; require multiple English function words.
- [Repair model damages formatting] → Validate placeholders and retain the original answer on failure.
