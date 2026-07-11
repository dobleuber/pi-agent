## ADDED Requirements

### Requirement: Human-readable router status
The router SHALL present its persistent footer status as concise human-readable activity rather than raw internal state tokens.

#### Scenario: Router is disabled
- **WHEN** the router status is initialized or updated while routing is disabled
- **THEN** the footer displays `◇ Router off`

#### Scenario: Prompt preparation is active
- **WHEN** the enabled router is preprocessing an eligible prompt
- **THEN** the footer displays `◆ ` followed by the current playful preparation phrase

#### Scenario: Model reasoning begins
- **WHEN** prompt preprocessing selects a thinking level and dispatches the transformed prompt
- **THEN** the footer displays `◆ Thinking · <level>` using the selected level

#### Scenario: Strict routing failure blocks dispatch
- **WHEN** router preprocessing returns a handled degraded result
- **THEN** the footer displays `◇ Router degraded`

### Requirement: Router status details remain accessible
The router SHALL keep operational details available through router commands, notifications, and recorded router details while omitting those diagnostics from the persistent footer.

#### Scenario: User requests router details
- **WHEN** the user runs `/router`
- **THEN** the router reports enabled state, local mode, router model, and work model through its notification without replacing the concise footer format

### Requirement: Theme-aware semantic status colors
The router SHALL use Pi theme colors to emphasize status semantics without embedding fixed ANSI color values.

#### Scenario: Active prompt preparation
- **WHEN** a prompt-preparation phrase is displayed
- **THEN** the active `◆` symbol uses the theme accent color and the phrase remains in the normal text color

#### Scenario: Active reasoning
- **WHEN** a reasoning status is displayed
- **THEN** the active `◆` symbol uses the theme accent color and the `· <level>` value uses the theme dim color

#### Scenario: Router is disabled
- **WHEN** `◇ Router off` is displayed
- **THEN** the complete status uses the theme muted color

#### Scenario: Router is degraded
- **WHEN** a degraded router status is displayed
- **THEN** the degraded symbol and label use the theme warning color
