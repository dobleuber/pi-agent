## ADDED Requirements

### Requirement: Pi Router supports the full Pi thinking-level vocabulary
Pi Router SHALL represent `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, and `max` as valid requested and effective thinking levels.

#### Scenario: Router classifier returns an extended level
- **WHEN** GPT Mini returns `xhigh` for a valid complex task
- **THEN** Pi Router MUST preserve `xhigh` as a valid advisory suggestion
- **AND** it MUST NOT normalize the value down to `high`

#### Scenario: Automatic classifier returns max
- **WHEN** GPT Mini returns `max` without explicit maximum intent in the original prompt
- **THEN** Pi Router MUST cap the automatic suggestion to `xhigh`
- **AND** it MUST record that policy normalization occurred

### Requirement: Explicit prompt-level thinking overrides are binding
Pi Router SHALL recognize `@thinking:<level>` controls and unequivocal English or Spanish natural-language requests for a named or maximum reasoning level.

#### Scenario: User uses explicit syntax
- **WHEN** the original prompt begins with `@thinking:max`
- **THEN** Pi Router MUST request Sol Max when managed-family model routing is active
- **AND** it MUST request `max` on a preserved external model otherwise
- **AND** it MUST remove the control directive from the task dispatched to the work model

#### Scenario: User requests all capabilities in natural language
- **WHEN** the original prompt unequivocally asks to use all capabilities, maximum reasoning, or maximum effort
- **THEN** Pi Router MUST request Sol Max when managed-family model routing is active
- **AND** it MUST request `max` on a preserved external model otherwise
- **AND** GPT Mini MUST NOT lower that request

#### Scenario: Syntax conflicts with natural language
- **WHEN** `@thinking:high` appears with natural-language wording that requests `max`
- **THEN** Pi Router MUST request `high`
- **AND** it MUST record that explicit syntax took precedence

#### Scenario: Invalid explicit level
- **WHEN** the prompt contains an unsupported `@thinking:<value>` control
- **THEN** Pi Router MUST NOT dispatch the task
- **AND** it MUST show concise valid-level usage feedback

### Requirement: Automatic thinking selection uses an explainable hybrid policy
Pi Router SHALL combine deterministic complexity, risk, depth, and workflow floors with GPT Mini's advisory semantic classification. It SHALL use `medium` as the conservative default for preserved external models and SHALL delegate managed-family effort selection to the approved model-profile table.

#### Scenario: Trivial low-risk request on a preserved external model
- **WHEN** model routing preserves an external model
- **AND** local simple-task signals and GPT Mini both classify a request as unambiguously trivial and low risk
- **THEN** Pi Router MUST request `low`

#### Scenario: Trivial managed-family coding request
- **WHEN** managed-family model routing is active for a coding task
- **THEN** Pi Router MUST apply at least the approved Luna Max quality-floor profile
- **AND** it MUST NOT select Luna Low or Luna Medium automatically

#### Scenario: Low suggestion lacks confirming simple signals
- **WHEN** GPT Mini suggests `low` but the prompt is coding, tool-using, contextual, uncertain, or multi-step
- **THEN** Pi Router MUST request at least `medium`
- **AND** it MUST record the policy floor

#### Scenario: Difficult debugging or architecture work
- **WHEN** the task requires difficult debugging, architecture analysis, multi-file refactoring, migration planning, performance analysis, destructive work, or complex planning
- **THEN** Pi Router MUST request at least `high`

#### Scenario: Exhaustive high-value workflow
- **WHEN** the task is code review, security analysis, exhaustive repository review, deep external research, or challenging long-running agentic work
- **THEN** Pi Router MUST select Sol XHigh when managed-family model routing is active
- **AND** it MUST apply an `xhigh` floor to a preserved external model
- **AND** a contradictory `low` model suggestion MUST NOT reduce it

#### Scenario: Contextual follow-up
- **WHEN** the latest prompt is a reference such as “review it again” and conversation context identifies the referenced task as exhaustive review
- **THEN** Pi Router MUST retain the referenced task's high-complexity floor

### Requirement: The router dominates session thinking selection without a prompt override
When no prompt-level override exists, Pi Router SHALL select thinking effort independently of the level previously chosen with Shift+Tab.

#### Scenario: Manual level differs from automatic policy
- **WHEN** the session level is `high` and a new prompt is unambiguously trivial
- **THEN** Pi Router MAY request `low`
- **AND** it MUST record the policy reason rather than treating the previous level as a floor

### Requirement: Pi is the source of truth for effective model capabilities
Pi Router SHALL apply the requested level through `pi.setThinkingLevel()` and read `pi.getThinkingLevel()` to determine the effective level after model-specific clamping.

#### Scenario: Requested level is unsupported
- **WHEN** Pi clamps requested `xhigh` to effective `high`
- **THEN** Pi Router MUST continue with `high`
- **AND** it MUST warn that `xhigh` was adjusted to `high`
- **AND** it MUST persist requested level, effective level, and clamp reason

#### Scenario: Requested level is supported
- **WHEN** Pi reports the same effective level that the policy requested
- **THEN** Pi Router MUST NOT show a clamp warning

### Requirement: Thinking decisions are auditable
Pi Router SHALL persist the router suggestion, policy-selected level, effective level, concise reason, normalized signals, override source, and clamp state without storing hidden chain-of-thought.

#### Scenario: Policy raises a low model suggestion
- **WHEN** GPT Mini suggests `low` and the local policy selects Sol XHigh or an external-model `xhigh` floor
- **THEN** router details MUST show both suggestions and the effective profile
- **AND** they MUST identify the complexity, risk, depth, or workflow signals that caused the elevation

#### Scenario: Evaluation matrix runs
- **WHEN** the policy test suite executes
- **THEN** it MUST cover bilingual trivial, routine, complex, high-risk, exhaustive, explicit-maximum, contradictory-classifier, unsupported-level, and contextual-follow-up cases
