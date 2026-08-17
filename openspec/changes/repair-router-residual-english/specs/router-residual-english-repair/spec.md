## ADDED Requirements

### Requirement: Residual English validation
The router SHALL detect significant natural-language English remaining outside protected blocks after final-answer translation.

#### Scenario: Slightly modified English evades equality validation
- **WHEN** translated output contains `This is now mature eenough for an OpenSpec change such as:`
- **THEN** the router identifies the phrase as residual English despite the changed spelling

### Requirement: Single bounded repair pass
The router SHALL make at most one additional repair request when residual English is detected and SHALL make no repair request for a clean Spanish result.

#### Scenario: Multiple fragments remain English
- **WHEN** multiple English prose fragments remain after initial translation
- **THEN** the router submits them through one combined repair pass rather than retrying each fragment independently

#### Scenario: Initial translation is clean
- **WHEN** no significant residual English is detected
- **THEN** the router performs no repair call

### Requirement: Coherent final output
The router SHALL accept repaired output only when protected placeholders remain valid and significant residual English is absent.

#### Scenario: Repair succeeds
- **WHEN** the repair output is Spanish and valid
- **THEN** the router returns the repaired Spanish answer without the resolved initial fallback events

#### Scenario: Repair fails
- **WHEN** repair is empty, invalid, or still contains significant English
- **THEN** the router returns the coherent original answer with a degraded warning instead of silently returning mixed-language prose
