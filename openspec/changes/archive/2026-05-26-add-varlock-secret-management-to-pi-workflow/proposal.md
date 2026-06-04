## Why

The current Pi workflow documentation covers agent tooling such as RTK, CodeGraph, and OpenSpec, but it does not define a safe, repeatable approach for managing secrets used by local AI-agent workflows. Adding Varlock provides a dedicated secrets workflow so credentials and sensitive configuration can be managed without relying on ad hoc shell exports, plaintext notes, or tracked repository files.

## What Changes

- Document Varlock as an optional secret-management tool for the Pi workflow, including installation, initialization, and verification guidance.
- Add guidance for storing and loading secrets needed by Pi-adjacent tools without committing secret material to this repository.
- Clarify how Varlock fits alongside existing optional workflow tools and how the setup behaves when Varlock is absent.
- Provide examples for common secret-management tasks relevant to local agent sessions.
- No breaking changes are expected; existing Pi, OpenSpec, CodeGraph, RTK, and skill workflows remain usable without Varlock.

## Capabilities

### New Capabilities

- `varlock-secret-management`: Defines the repository documentation requirements for integrating Varlock as an optional secret-management workflow for Pi and related local AI-agent tooling.

### Modified Capabilities

None.

## Impact

- Affected documentation: `README.md` and any related workflow/setup notes needed to describe optional Varlock usage.
- Affected specs: adds a new OpenSpec capability under `openspec/specs/varlock-secret-management/`.
- Affected systems: local user shell/agent environment and user-level secret storage practices.
- No tracked secret files, generated Varlock state, or machine-specific credentials should be added to the repository.
