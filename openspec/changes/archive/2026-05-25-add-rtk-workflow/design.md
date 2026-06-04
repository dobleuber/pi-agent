## Context

This repository documents and tracks a portable Pi coding-agent setup, including local restore steps, custom skills, OpenSpec-generated prompts/skills, and related workflow tools. The proposed RTK integration introduces an external CLI proxy from `rtk-ai/rtk` that compresses common development command output before it reaches an AI-agent context.

RTK is primarily a user-environment/tooling integration rather than an application dependency. Its hook-based setup can rewrite Bash tool commands for supported agents, while built-in file/search/read tools in agents may bypass shell hooks and therefore require explicit `rtk` commands when compact output is desired.

## Goals / Non-Goals

**Goals:**
- Document RTK as an optional workflow optimization for reducing token usage during AI-assisted development.
- Provide install, initialization, verification, and usage guidance compatible with this repository's Pi/Codex/OpenSpec-oriented setup.
- Make clear when automatic hook rewriting applies and when explicit `rtk` command usage is required.
- Keep the integration reversible and non-disruptive to existing workflows.

**Non-Goals:**
- Vendor RTK binaries or source code into this repository.
- Require RTK for using Pi, OpenSpec, or any tracked skills.
- Replace existing Pi tools, built-in file readers, search tools, or OpenSpec commands.
- Configure RTK automatically during repository restore without explicit user action.

## Decisions

### Document RTK as an optional setup step

RTK should be added to the setup documentation as an optional AI workflow optimization rather than a mandatory prerequisite.

Alternatives considered:
- **Mandatory prerequisite**: Rejected because the repository should remain usable without RTK and because RTK mutates user-level agent/shell hook configuration.
- **No repository documentation**: Rejected because future setup/restore workflows would not capture how RTK fits with Pi/Codex usage.

### Prefer user-level initialization over tracked configuration

RTK initialization should be performed by the user with commands such as `rtk init -g`, `rtk init -g --codex`, or the appropriate agent-specific initialization command. The repository should document those commands but not track generated hook files unless a later investigation proves they are safe, stable, and portable.

Alternatives considered:
- **Track generated hook configuration**: Rejected for now because RTK may generate user- or tool-specific files and the exact output depends on installed agents.
- **Wrap repository scripts with RTK**: Rejected because the workflow targets interactive agent command output, not project runtime scripts.

### Preserve explicit command guidance

Documentation should include examples for both automatic hook usage and explicit RTK usage (`rtk git status`, `rtk read`, `rtk grep`, `rtk test <cmd>`). This prevents confusion when commands run through agent built-in tools do not pass through Bash hooks.

Alternatives considered:
- **Only document automatic hooks**: Rejected because it hides an important limitation and could lead to inconsistent expectations.
- **Only document explicit RTK commands**: Rejected because it misses RTK's intended agent-hook workflow and creates unnecessary manual friction.

### Verify through observable compact output

The integration should include verification steps: `rtk --version`, `rtk gain`, and at least one supported command that demonstrates compact output, such as `rtk git status` or a Bash-tool `git status` after agent restart.

Alternatives considered:
- **Version check only**: Rejected because installation does not prove hooks are active or useful.
- **Automated verification script**: Rejected initially because the setup is optional and user-environment-specific.

## Risks / Trade-offs

- **RTK hook behavior may vary by agent or version** → Mitigate by linking to RTK upstream docs and documenting verification commands rather than assuming a single generated configuration shape.
- **Built-in agent tools may bypass RTK** → Mitigate with explicit caveats and examples for `rtk read`, `rtk grep`, and Bash commands.
- **Compressed output may omit details needed for debugging** → Mitigate by documenting that users can run the original command or use less aggressive RTK modes when full output is necessary.
- **User-level hook changes may be surprising** → Mitigate by keeping setup opt-in and documenting rollback/reinitialization guidance where available.
- **RTK upstream install commands or versions may change** → Mitigate by referencing the upstream repository and avoiding pinned claims beyond verification examples.
