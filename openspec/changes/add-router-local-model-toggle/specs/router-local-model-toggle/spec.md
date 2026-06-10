## ADDED Requirements

### Requirement: Router local mode is independent from router enabled state
The router SHALL provide a persistent local mode that selects whether routing uses the local router model or the remote router model without changing whether routing itself is enabled.

#### Scenario: Enabling router preserves local mode
- **WHEN** the user runs `/router on`
- **THEN** the router MUST enable routing without changing the current local mode

#### Scenario: Disabling router preserves local mode
- **WHEN** the user runs `/router off`
- **THEN** the router MUST disable routing without changing the current local mode

#### Scenario: Status reports both states
- **WHEN** the user runs `/router`
- **THEN** the status MUST include both the router enabled state and the local mode state

### Requirement: Local mode on selects and starts the local router model
The router SHALL support `/router local on` to select the local `llama-cpp/gemma4` router model and ensure its llama.cpp server is running.

#### Scenario: Local model server is already running
- **WHEN** the user runs `/router local on` and the configured local model endpoint responds
- **THEN** the router MUST select `llama-cpp/gemma4` as the active router model without starting another server process

#### Scenario: Local model server is down
- **WHEN** the user runs `/router local on` and the configured local model endpoint does not respond
- **THEN** the router MUST start the configured `llama-gemma4-server` wrapper and select `llama-cpp/gemma4` as the active router model

#### Scenario: Local model start fails
- **WHEN** the user runs `/router local on` and starting the configured local server fails
- **THEN** the router MUST keep local mode selected and notify the user that the local server could not be started

### Requirement: Local mode off selects remote routing and stops the local model server
The router SHALL support `/router local off` to select the remote `openai-codex/gpt-5.4-nano` router model and stop the local llama.cpp server for the configured local router model.

#### Scenario: Switching to remote mode
- **WHEN** the user runs `/router local off`
- **THEN** the router MUST select `openai-codex/gpt-5.4-nano` as the active router model

#### Scenario: Stopping local server
- **WHEN** the user runs `/router local off`
- **THEN** the router MUST stop the llama.cpp server serving the configured local router model port

#### Scenario: Local server stop fails
- **WHEN** the user runs `/router local off` and stopping the configured local server fails
- **THEN** the router MUST keep remote mode selected and notify the user that the local server could not be stopped

### Requirement: Active router model follows local mode
Prompt routing and final-answer translation SHALL use the router model profile selected by the current local mode.

#### Scenario: Routing while local mode is on
- **WHEN** routing is enabled and local mode is on
- **THEN** prompt routing and final-answer translation MUST use `llama-cpp/gemma4` at `http://127.0.0.1:11434/v1`

#### Scenario: Routing while local mode is off
- **WHEN** routing is enabled and local mode is off
- **THEN** prompt routing and final-answer translation MUST use `openai-codex/gpt-5.4-nano` at `https://chatgpt.com/backend-api`

#### Scenario: Codex Nano is not exposed by the installed catalog yet
- **WHEN** routing is enabled, local mode is off, and `ctx.modelRegistry` does not find `openai-codex/gpt-5.4-nano`
- **THEN** prompt routing and final-answer translation MUST try the configured Codex fallback model without using OpenRouter or direct OpenAI API-key calls

### Requirement: Local mode is persisted
The router SHALL persist local mode so the selected router model profile survives new Pi sessions.

#### Scenario: Persist local mode on
- **WHEN** the user runs `/router local on` and starts a later Pi session
- **THEN** the router MUST restore local mode as on

#### Scenario: Persist local mode off
- **WHEN** the user runs `/router local off` and starts a later Pi session
- **THEN** the router MUST restore local mode as off

### Requirement: Local command usage is explicit
The router SHALL handle incomplete or unknown local subcommands with concise usage feedback instead of changing router state.

#### Scenario: Missing local action
- **WHEN** the user runs `/router local` without `on` or `off`
- **THEN** the router MUST report current local mode and show the accepted usage

#### Scenario: Unknown local action
- **WHEN** the user runs an unknown `/router local <action>` command
- **THEN** the router MUST leave router state and local mode unchanged and show the accepted usage
