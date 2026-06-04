## 1. Documentation Placement

- [x] 1.1 Identify the appropriate README section for optional RTK workflow setup near existing AI-agent/OpenSpec tooling prerequisites.
- [x] 1.2 Add RTK to the tracked setup overview as an optional workflow optimization, not a required dependency.

## 2. RTK Setup Guidance

- [x] 2.1 Document supported RTK installation options with an upstream reference to `https://github.com/rtk-ai/rtk`.
- [x] 2.2 Document agent initialization commands for the intended workflow, including Pi-compatible generic hooks and Codex-specific initialization where relevant.
- [x] 2.3 Document that generated RTK hook configuration is user-level and should not be tracked in this repository by default.

## 3. Usage Guidance

- [x] 3.1 Document automatic hook behavior for supported Bash tool commands after RTK initialization and agent restart.
- [x] 3.2 Document the built-in tool limitation: agent read/file/search tools may bypass shell hooks.
- [x] 3.3 Add explicit RTK command examples for common compact-output workflows such as `rtk git status`, `rtk read`, `rtk grep`, and `rtk test <cmd>`.
- [x] 3.4 Document when to bypass RTK or run original commands to inspect full output during debugging.

## 4. Verification

- [x] 4.1 Add verification commands for `rtk --version`, `rtk gain`, and at least one compact command-output example.
- [x] 4.2 Verify documentation remains accurate when RTK is absent, making clear that Pi, OpenSpec, and tracked skills still work without it.
- [x] 4.3 Run `npx --yes @fission-ai/openspec@latest status --change add-rtk-workflow` and confirm all artifacts are complete before implementation.
