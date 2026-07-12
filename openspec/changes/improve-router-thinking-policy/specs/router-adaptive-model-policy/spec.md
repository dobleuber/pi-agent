## ADDED Requirements

### Requirement: Model routing is limited to the active GPT-5.6 Codex family
Pi Router SHALL automatically switch work models only when the current work model is `openai-codex/gpt-5.6-luna`, `openai-codex/gpt-5.6-terra`, or `openai-codex/gpt-5.6-sol`.

#### Scenario: Current model belongs to the managed family
- **WHEN** the current model is Luna, Terra, or Sol
- **THEN** Pi Router MUST select the approved managed-family profile for the task

#### Scenario: Current model belongs to another family or provider
- **WHEN** the current model is Stratus, ZAI, Anthropic, or any model outside the managed GPT-5.6 family
- **THEN** Pi Router MUST preserve that work model
- **AND** it MUST apply only the adaptive thinking policy supported by Pi
- **AND** it MUST record `modelRouting: preserved-external`

### Requirement: Managed-family routing uses the approved coding quality-cost frontier
Pi Router SHALL automatically select among Luna Max, Terra Max, and Sol XHigh, while reserving Sol Max for explicit maximum-quality intent.

#### Scenario: Routine clear agentic coding
- **WHEN** a coding, search, transformation, or tool task is routine, clear, or mechanical
- **THEN** Pi Router MUST select Luna Max
- **AND** it MUST NOT automatically select Luna Low or Luna Medium

#### Scenario: Complex bounded coding
- **WHEN** a coding task is complex but has bounded scope and clear completion criteria
- **THEN** Pi Router MUST select Terra Max

#### Scenario: Difficult high-value work
- **WHEN** a task requires difficult debugging, architecture, deep code review, security analysis, exhaustive repository analysis, or high-value research
- **THEN** Pi Router MUST select Sol XHigh

#### Scenario: Explicit maximum-quality intent
- **WHEN** the original prompt explicitly requests maximum reasoning, maximum quality, or all capabilities
- **THEN** Pi Router MUST select Sol Max
- **AND** GPT Mini MUST NOT reduce the selected profile

#### Scenario: Lower explicit effort override
- **WHEN** a valid `@thinking:<level>` override explicitly requests a level below the automatic profile
- **THEN** Pi Router MUST honor the explicit level
- **AND** it MUST select the compatible managed-family model defined by the override policy

### Requirement: Dominated coding profiles are excluded from initial automatic routing
Pi Router SHALL NOT automatically select Luna Low, Luna Medium, Terra XHigh, Sol Medium, or Sol High in the initial managed-family coding profile table.

#### Scenario: Luna Max dominates Sol Medium for coding cost
- **WHEN** automatic policy would otherwise select Sol Medium
- **THEN** Pi Router MUST select Luna Max

#### Scenario: Terra Max dominates Sol High for coding cost
- **WHEN** automatic policy would otherwise select Sol High
- **THEN** Pi Router MUST select Terra Max

#### Scenario: Luna Max dominates Terra XHigh for coding cost
- **WHEN** automatic policy would otherwise select Terra XHigh
- **THEN** Pi Router MUST select Luna Max or a higher approved frontier profile according to the task quality floor

#### Scenario: Evaluation evidence changes
- **WHEN** representative quality, cost, or latency evaluations establish a different Pareto-efficient profile
- **THEN** maintainers MUST be able to update the centralized profile table without changing routed-turn event flow

### Requirement: Execution mode is separate from model and thinking effort
Pi Router SHALL represent `standard`, `parallel-agentic`, and `native-ultra` as distinct execution modes and SHALL NOT describe Pi subagent guidance as OpenAI native Ultra.

#### Scenario: Standard execution
- **WHEN** a task does not benefit from independent parallel work
- **THEN** Pi Router MUST use `executionMode: standard`

#### Scenario: Parallel-agentic execution is appropriate
- **WHEN** a task contains independent work units that can benefit from parallel execution
- **AND** Pi subagent tools are active
- **THEN** Pi Router MAY select `executionMode: parallel-agentic`
- **AND** it MUST provide bounded guidance to delegate only independent work
- **AND** it MUST preserve the already selected Luna Max, Terra Max, Sol XHigh, or Sol Max profile

#### Scenario: Subagents are unavailable
- **WHEN** `parallel-agentic` would otherwise be selected but Pi subagent tools are not active
- **THEN** Pi Router MUST retain the selected model-and-effort profile
- **AND** it MUST fall back to `executionMode: standard`
- **AND** it MUST warn and persist the execution-mode fallback

#### Scenario: Native Ultra is not exposed by Pi
- **WHEN** Pi does not expose a runtime capability for native OpenAI Ultra
- **THEN** Pi Router MUST NOT select `executionMode: native-ultra`
- **AND** it MUST NOT infer native Ultra from `max` or from local subagent availability

#### Scenario: Native Sol Ultra becomes available
- **WHEN** Pi explicitly exposes and can activate OpenAI native Ultra
- **AND** the user or approved policy explicitly requests that capability
- **THEN** Pi Router MAY select Sol with `executionMode: native-ultra`
- **AND** it MUST record the native capability used

### Requirement: Model switching is verified and failures remain visible
Pi Router SHALL resolve target models through Pi's model registry, call `pi.setModel()`, and confirm the effective model before applying reasoning effort.

#### Scenario: Preferred model is available
- **WHEN** the target managed-family model resolves and `pi.setModel()` succeeds
- **THEN** Pi Router MUST apply reasoning effort to that selected model
- **AND** status and details MUST report the effective model

#### Scenario: Preferred model is unavailable or switching fails
- **WHEN** the selected model cannot be resolved or `pi.setModel()` fails
- **THEN** Pi Router MUST preserve the current work model
- **AND** it MUST apply the nearest valid thinking policy through Pi
- **AND** it MUST warn and record the model fallback

### Requirement: Initial profile selection is quality-cost optimized, not latency-certified
Pi Router SHALL treat the initial managed-family profile table as derived from the saved official coding cost chart and SHALL NOT claim that it minimizes wall-clock latency without representative latency measurements.

#### Scenario: Status explains an automatic profile
- **WHEN** Pi Router reports why it selected Luna Max, Terra Max, Sol XHigh, or Sol Max
- **THEN** it MUST describe the decision as a quality-floor and cost-frontier choice
- **AND** it MUST NOT describe the profile as the fastest option without latency evidence

#### Scenario: Latency measurements become available
- **WHEN** representative live latency data is collected for all approved profiles
- **THEN** the profile evaluation suite MUST incorporate latency before any latency-sensitive routing rule is enabled

### Requirement: Model-and-execution decisions are auditable
Pi Router SHALL persist suggested tier, policy-selected model, effective model, requested/effective thinking level, requested/effective execution mode, selection reason, fallback state, and parallelizability signals.

#### Scenario: Managed-family profile is applied
- **WHEN** Luna Max, Terra Max, Sol XHigh, or Sol Max is selected
- **THEN** router details MUST identify the selected profile and quality-floor reason

#### Scenario: External model is preserved
- **WHEN** automatic family routing is bypassed for an external model
- **THEN** router details MUST identify the preserved model and the reason model routing was not applied

#### Scenario: Execution mode falls back
- **WHEN** requested `parallel-agentic` or `native-ultra` cannot be activated
- **THEN** router details MUST contain requested and effective execution modes plus the fallback reason
