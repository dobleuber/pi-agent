# rtk-workflow-integration Specification

## Purpose

Define the repository documentation requirements for integrating RTK as an optional token-saving command-output proxy in the AI-agent development workflow.

## Requirements

### Requirement: RTK setup documentation
The repository SHALL document RTK as an optional AI workflow optimization, including installation, agent initialization, and verification steps.

#### Scenario: User installs and verifies RTK
- **WHEN** a user follows the RTK setup documentation
- **THEN** they can install RTK, initialize it for their intended AI agent, and verify the installation with documented commands

#### Scenario: User restores the repository without RTK
- **WHEN** a user restores this repository and does not install RTK
- **THEN** the existing Pi, OpenSpec, and skill workflows remain usable without requiring RTK

### Requirement: Agent hook behavior guidance
The repository SHALL explain when RTK can optimize commands automatically through agent shell hooks and when users must invoke RTK explicitly.

#### Scenario: Command runs through Bash hook
- **WHEN** a supported agent Bash command is executed after RTK initialization and agent restart
- **THEN** the documentation indicates that RTK can rewrite or proxy the command automatically

#### Scenario: Built-in agent tool bypasses Bash hook
- **WHEN** an agent built-in read, file, grep, or search tool is used instead of a shell command
- **THEN** the documentation states that RTK hooks do not apply and suggests explicit RTK commands where compact output is desired

### Requirement: Explicit RTK command examples
The repository SHALL provide explicit RTK command examples for common development tasks that benefit from compact output.

#### Scenario: User wants compact command output manually
- **WHEN** a user wants compact output independent of automatic hooks
- **THEN** the documentation provides examples such as `rtk git status`, `rtk read`, `rtk grep`, and `rtk test <cmd>`

### Requirement: Reversible optional integration
The RTK workflow integration SHALL avoid tracking generated user-level hook configuration or requiring automatic repository-side configuration changes.

#### Scenario: User opts out of RTK
- **WHEN** a user chooses not to use RTK or removes RTK from their environment
- **THEN** no tracked repository file requires RTK-specific generated configuration for normal operation
