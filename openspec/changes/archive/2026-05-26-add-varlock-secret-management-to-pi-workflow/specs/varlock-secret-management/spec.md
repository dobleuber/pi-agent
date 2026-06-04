## ADDED Requirements

### Requirement: Varlock setup documentation
The repository SHALL document Varlock as an optional secret-management workflow for Pi and related local AI-agent tooling, including source, installation, initialization when applicable, and verification guidance.

#### Scenario: User installs and verifies Varlock
- **WHEN** a user follows the Varlock setup documentation
- **THEN** they can install Varlock and run documented verification commands to confirm the tool is available

#### Scenario: User restores the repository without Varlock
- **WHEN** a user restores this repository and does not install Varlock
- **THEN** the existing Pi, OpenSpec, CodeGraph, RTK, and skill workflows remain usable without requiring Varlock

### Requirement: Secret material remains untracked
The repository SHALL instruct users not to commit Varlock-managed secret values, generated local Varlock state, plaintext environment files containing secrets, tokens, credentials, or machine-specific secret configuration.

#### Scenario: User configures local secrets
- **WHEN** a user creates or updates secrets for local Pi workflows
- **THEN** the documentation states that secret material and generated local secret state MUST remain outside tracked repository files

#### Scenario: User needs example secret names
- **WHEN** documentation shows examples for secrets used by Pi-adjacent tooling
- **THEN** the examples MUST use placeholder names or dummy values rather than real credentials

### Requirement: Agent session secret usage guidance
The repository SHALL explain how Varlock fits into Pi-oriented agent sessions, including when to prefer Varlock-managed secrets over ad hoc shell exports, plaintext notes, or tracked configuration files.

#### Scenario: Agent workflow needs an API credential
- **WHEN** a Pi or AI-agent workflow requires a provider token, package-registry token, deployment credential, or similar secret
- **THEN** the documentation directs the user to load or inject that value through the Varlock workflow instead of committing it to the repository

#### Scenario: Secret is not needed for a session
- **WHEN** a Pi session does not require private credentials or sensitive configuration
- **THEN** the documentation indicates that Varlock does not need to be invoked for that session

### Requirement: Practical Varlock command examples
The repository SHALL provide concise Varlock usage examples for common local workflow tasks, while deferring authoritative command details to upstream Varlock documentation.

#### Scenario: User wants to manage local agent secrets
- **WHEN** a user reads the Varlock workflow documentation
- **THEN** they see examples for verifying Varlock availability and managing or loading representative agent secrets using non-sensitive placeholder values

#### Scenario: Upstream Varlock behavior changes
- **WHEN** a documented command may differ from the installed Varlock version
- **THEN** the documentation points users to upstream Varlock help or documentation as the authoritative reference
