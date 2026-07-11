## ADDED Requirements

### Requirement: Immediate prompt preparation feedback
The router SHALL show a prompt-preparation-specific working message immediately while preprocessing an eligible interactive prompt when routing is enabled.

#### Scenario: Eligible prompt begins preprocessing
- **WHEN** the enabled router accepts an eligible interactive prompt
- **THEN** a playful prompt-preparation working message is shown before asynchronous preprocessing completes

#### Scenario: Input is not routed
- **WHEN** input is ineligible or routing is disabled
- **THEN** the router does not start prompt-preparation working feedback

### Requirement: Rotating prompt preparation phrases
The router SHALL replace the prompt-preparation working message every two seconds and SHALL NOT repeat the same phrase consecutively when multiple phrases are available.

#### Scenario: Preprocessing lasts longer than two seconds
- **WHEN** prompt preprocessing remains active for at least two seconds
- **THEN** the working message changes to a different prompt-preparation phrase

### Requirement: Prompt preparation feedback cleanup
The router SHALL stop phrase rotation and clear its working message whenever prompt preprocessing ends, including successful, degraded, and exceptional completion.

#### Scenario: Preprocessing succeeds
- **WHEN** prompt preprocessing returns a routing result
- **THEN** the rotation timer is stopped and the router working message is cleared before input handling returns

#### Scenario: Preprocessing throws
- **WHEN** prompt preprocessing terminates with an exception
- **THEN** the rotation timer is stopped and the router working message is cleared before the exception propagates

### Requirement: Feedback phase isolation
Prompt-preparation feedback SHALL NOT alter normal reasoning feedback or final-answer translation feedback.

#### Scenario: Prompt preprocessing completes
- **WHEN** the router finishes preprocessing the initial prompt
- **THEN** ownership of the working-message surface is available for the normal reasoning lifecycle and no final-answer behavior is changed
