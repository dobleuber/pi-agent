## ADDED Requirements

### Requirement: Single remote router model
Pi Router SHALL use `openai-codex/gpt-5.4-mini` for prompt routing and final translation and SHALL NOT select or start a local llama.cpp model.

#### Scenario: Router is enabled
- **WHEN** an eligible prompt is submitted
- **THEN** the configured remote GPT mini model handles routing

#### Scenario: Legacy state enables local mode
- **WHEN** persisted state contains `localMode: on`
- **THEN** Pi Router ignores the legacy field and continues with the remote model

### Requirement: Local controls are removed
Pi Router SHALL expose only enabled, disabled, and status command behavior.

#### Scenario: User requests local mode
- **WHEN** the user invokes `/router local on` or `/router local off`
- **THEN** no local model lifecycle action is performed

### Requirement: Pi AI is the sole router transport
Pi Router SHALL invoke the configured remote model through Pi's model registry and completion API and SHALL NOT maintain a direct OpenAI-compatible HTTP transport.

#### Scenario: Routing or translation executes
- **WHEN** Pi Router calls `openai-codex/gpt-5.4-mini`
- **THEN** it resolves subscription authentication through Pi AI
- **AND** no llama.cpp stop tokens, local base URL, or direct `/chat/completions` request is used
