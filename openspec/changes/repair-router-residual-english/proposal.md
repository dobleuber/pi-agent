## Why

Real Pi sessions frequently contain untranslated English prose embedded in otherwise Spanish final answers. Exact-equality validation misses slightly modified English, while short failed chunks are not retried and are inserted unchanged.

## What Changes

- Detect significant residual English outside protected code and identifiers after the initial translation pass.
- Run at most one whole-answer repair request that translates remaining English while preserving existing Spanish and formatting.
- Accept repair only when residual English is removed and placeholders remain valid.
- Fall back to a coherent original answer with a warning if bounded repair fails, rather than silently presenting mixed prose.
- Record regression tests from observed session failures and enforce one additional repair call maximum.

## Capabilities

### New Capabilities

- `router-residual-english-repair`: Defines residual-language validation, bounded repair, and coherent fallback behavior.

### Modified Capabilities

None.

## Impact

- Affects final-answer translation validation and tests.
- Adds no dependency and at most one model call for answers with detected residual English.
