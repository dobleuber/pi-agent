## Purpose

Prevent concrete or leaked translation examples from replacing unrelated user intent during prompt routing.

## Requirements

### Requirement: Concrete translation examples do not influence routing
The router prompt SHALL NOT include the `Arregla los tests → Fix the tests` few-shot pair.

#### Scenario: User asks to try again
- **WHEN** the original prompt is `Probemos de nuevo`
- **THEN** the routed prompt does not become `Fix the tests`

#### Scenario: Router returns leaked legacy example
- **WHEN** the router returns `Fix the tests` for an unrelated prompt
- **THEN** Pi Router safely passes through the original prompt with a degradation warning instead of dispatching the invented task
