## Why

The current AI-assisted development workflow can produce large command outputs that consume context quickly and make sessions harder to steer. RTK offers a command-output proxy that can reduce token usage for common development commands, so documenting and integrating it could make this repository's Pi/Codex/OpenSpec workflows more efficient.

## What Changes

- Add a documented RTK integration path for this personal AI-agent workflow, including install, initialization, verification, and day-to-day usage guidance.
- Define when RTK should be used automatically through agent shell hooks versus when commands should call `rtk` explicitly.
- Document caveats for tool-specific behavior, especially that built-in file/read/search tools do not pass through shell hooks.
- Add verification guidance to confirm RTK is installed, initialized for the intended agent tools, and producing compact output.

## Capabilities

### New Capabilities
- `rtk-workflow-integration`: Covers installing, configuring, verifying, and using RTK as a token-saving command-output proxy in the AI development workflow.

### Modified Capabilities

## Impact

- Repository documentation for local setup and AI-agent workflow usage.
- Potential user-level shell or agent hook configuration outside the repository when RTK is initialized.
- No expected breaking changes to existing OpenSpec, Pi, or skill behavior.
