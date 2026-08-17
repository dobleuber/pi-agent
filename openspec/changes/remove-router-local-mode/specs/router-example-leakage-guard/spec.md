## ADDED Requirements

### Requirement: Concrete translation examples do not influence routing
The router prompt SHALL NOT include the `Arregla los tests → Fix the tests` few-shot pair.

#### Scenario: User asks to try again
- **WHEN** the original prompt is `Probemos de nuevo`
- **THEN** the routed prompt does not become `Fix the tests`

#### Scenario: Router returns leaked legacy example
- **WHEN** the router returns `Fix the tests` for an unrelated prompt
- **THEN** Pi Router safely passes through the original prompt with a degradation warning instead of dispatching the invented task

### Requirement: Required prompt evidence is preserved
Pi Router SHALL reject routed output that loses protected placeholders or exact quoted evidence from the latest user prompt.

#### Scenario: Routed output drops protected or quoted input
- **WHEN** model output omits a protected path, fenced block placeholder, inline command, or quoted string
- **THEN** Pi Router dispatches the original prompt with a degradation warning
- **AND** it performs no additional validation model call
