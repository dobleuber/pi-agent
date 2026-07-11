## REMOVED Requirements

### Requirement: Router local mode is independent from router enabled state
**Reason**: Local routing is removed; router enablement now controls one remote model path.
**Migration**: Continue using `/router on` and `/router off`.

### Requirement: Local mode on selects and starts the local router model
**Reason**: Pi Router no longer manages or selects llama.cpp.
**Migration**: Use the sole `openai-codex/gpt-5.4-mini` router model.

### Requirement: Local mode off selects remote routing and stops the local model server
**Reason**: Remote routing is now unconditional and local process lifecycle is outside Pi Router.
**Migration**: Remove `/router local off`; manage standalone llama.cpp independently if needed.

### Requirement: Active router model follows local mode
**Reason**: There is no local-mode selector.
**Migration**: The active router model is always `openai-codex/gpt-5.4-mini`.

### Requirement: Local mode is persisted
**Reason**: Persisted local mode caused stale Gemma routing after migration.
**Migration**: Legacy `localMode` is ignored; only router enabled state remains persisted.

### Requirement: Local command usage is explicit
**Reason**: `/router local` commands are removed.
**Migration**: `/router local ...` reports that local mode was removed and performs no lifecycle action.
