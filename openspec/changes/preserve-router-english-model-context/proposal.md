## Why

The router currently persists Spanish display translations as assistant history, so later work-model calls receive a mixed English/Spanish conversation and may answer directly in Spanish. The final translator then retranslates already-Spanish output, producing noisy warnings and potentially changing meaning.

## What Changes

- Restore recorded English assistant answers non-destructively in the context sent to the work model while retaining Spanish text in the visible session.
- Reconstruct English/Spanish answer pairs from persisted completed router-detail entries so restoration survives reloads and session resumes.
- Skip final-answer translation when the complete work-model answer is already predominantly Spanish.
- Preserve the current untranslated-output warning for genuinely English output that a translator echoes unchanged.

## Capabilities

### New Capabilities

- `router-dual-view-history`: Defines Spanish visible history with English work-model context restoration.
- `router-final-language-guard`: Defines whole-answer language guarding before final translation.

### Modified Capabilities

None.

## Impact

- Affects Pi router `context` and `message_end` lifecycle handling, final-answer translation, persisted router details, and tests.
- Uses existing Pi context-event and session-manager APIs; no external dependency is added.
