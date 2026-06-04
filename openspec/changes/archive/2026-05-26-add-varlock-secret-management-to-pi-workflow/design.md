## Context

This repository documents a portable Pi coding-agent setup, including optional workflow tools such as RTK, CodeGraph, OpenSpec-generated prompts/skills, and local agent conventions. Secrets may be needed for model providers, API clients, package registries, deployment tools, or other Pi-adjacent workflows, but the current setup does not document a dedicated secret-management path.

Varlock will be introduced as an optional user-level secret-management tool for local Pi workflows. The repository should document how to install and verify Varlock, how to use it for agent sessions, and how to keep secret values and generated local state out of tracked files.

## Goals / Non-Goals

**Goals:**

- Document Varlock as an optional secret-management workflow for Pi and related local AI-agent tooling.
- Provide a safe restore/setup path that helps users avoid committing secrets, `.env` values, tokens, or machine-specific generated state.
- Explain when Varlock should be used instead of ad hoc shell exports, plaintext notes, or tracked config files.
- Include practical verification and usage examples that fit the existing README style.
- Preserve existing Pi, OpenSpec, CodeGraph, RTK, and skill workflows when Varlock is not installed.

**Non-Goals:**

- Require Varlock for using Pi or restoring this repository.
- Migrate existing secrets automatically or infer secret values from the environment.
- Track encrypted vaults, plaintext secret files, generated Varlock state, or user-specific credentials in the repository.
- Replace upstream Varlock documentation with a complete command reference.
- Add application-level secret rotation, cloud secret-manager integration, or team policy enforcement beyond local workflow documentation.

## Decisions

1. **Treat Varlock as optional workflow tooling.**
   - Decision: Document Varlock in the optional tooling/setup area, near RTK and OpenSpec workflow guidance, instead of making it a hard prerequisite.
   - Rationale: This repository should remain restorable and usable on machines where Varlock is absent, while still offering a safer path for users who need secrets in agent sessions.
   - Alternatives considered: Make Varlock mandatory for all Pi sessions. Rejected because it would add setup friction and break the current optional-tool pattern.

2. **Keep secret material and generated state out of version control.**
   - Decision: The documentation will explicitly state that Varlock-managed secrets, generated machine state, local environment files, and credentials must not be committed.
   - Rationale: The repository is a portable configuration/workflow repo, not a secret store. Even encrypted or generated files may be machine- or policy-specific and should not be tracked without deliberate review.
   - Alternatives considered: Commit a sample vault or generated config. Rejected because it risks confusing examples with real secret state and may create unsafe defaults.

3. **Document generic usage examples, not brittle deep integration.**
   - Decision: Provide concise examples for installing, verifying, storing, and loading secrets for local sessions, while deferring exact command semantics to upstream Varlock documentation where needed.
   - Rationale: Varlock is an external tool, and the repository should avoid overfitting to implementation details that may change. The goal is workflow integration, not maintaining a mirror of upstream docs.
   - Alternatives considered: Add wrapper scripts or shell hooks immediately. Rejected until a concrete local workflow proves the need.

4. **Make absence behavior explicit.**
   - Decision: The spec and docs will include scenarios showing that Pi and related workflows continue normally when Varlock is not installed.
   - Rationale: This matches the repository's existing optional-tool pattern and helps users distinguish recommended security practices from hard requirements.
   - Alternatives considered: Fail setup checks when Varlock is missing. Rejected because not every user/session needs secrets.

## Risks / Trade-offs

- **Risk: Varlock command examples drift from upstream behavior.** → Mitigation: Keep examples minimal, include verification steps, and link to upstream documentation for authoritative usage.
- **Risk: Users accidentally commit secret-related files.** → Mitigation: Add clear documentation about untracked secret state and, during implementation, review ignore rules or warnings where appropriate.
- **Risk: Optional integration is too vague to be useful.** → Mitigation: Include concrete local-session examples for common Pi-adjacent secrets while avoiding sensitive values.
- **Risk: Tool availability differs across machines.** → Mitigation: Document fallback behavior and state that workflows remain usable without Varlock.

## Migration Plan

1. Add a new `varlock-secret-management` capability spec defining the documentation and safety requirements.
2. Update README/setup documentation with Varlock source, install, verification, usage, and non-requirement guidance.
3. Confirm that no secret material or generated Varlock state is added to tracked files.
4. Validate the OpenSpec change before implementation is considered complete.

Rollback is documentation-only: remove the Varlock documentation section and the associated spec/change artifacts if the integration is not adopted.

## Open Questions

- Which exact Varlock commands should be documented for storing and loading secrets after verifying the current upstream CLI behavior?
- Should this repository add explicit ignore patterns for common Varlock/local secret files, or is documentation sufficient for the first iteration?
