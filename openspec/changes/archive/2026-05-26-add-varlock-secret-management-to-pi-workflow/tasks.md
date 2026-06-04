## 1. Research Varlock CLI behavior

- [x] 1.1 Identify the authoritative Varlock source, installation instructions, and supported verification commands from upstream documentation.
- [x] 1.2 Verify the current Varlock CLI help or documentation for commands used to initialize, manage, and load secrets.
- [x] 1.3 Record only non-sensitive placeholder examples suitable for a public workflow README.

## 2. Documentation updates

- [x] 2.1 Add an optional Varlock secret-management section to `README.md` near the existing optional AI workflow tooling.
- [x] 2.2 Document install, setup or initialization when applicable, and verification commands for Varlock.
- [x] 2.3 Document when Pi users should prefer Varlock-managed secrets over ad hoc shell exports, plaintext notes, or tracked configuration files.
- [x] 2.4 Add practical examples for representative Pi-adjacent secrets using placeholder names and dummy values only.
- [x] 2.5 State that Pi, OpenSpec, CodeGraph, RTK, and skill workflows continue to work when Varlock is absent.

## 3. Secret safety and repository hygiene

- [x] 3.1 Document that Varlock-managed secret values, generated local Varlock state, plaintext secret environment files, tokens, credentials, and machine-specific secret configuration must not be committed.
- [x] 3.2 Review existing ignore rules and documentation to decide whether additional local secret or Varlock-related ignore patterns are needed.
- [x] 3.3 Confirm the implementation does not add real secrets, generated Varlock state, encrypted vaults, or machine-specific credentials to tracked files.

## 4. Validation

- [x] 4.1 Validate the OpenSpec change with `npx --yes @fission-ai/openspec@latest validate add-varlock-secret-management-to-pi-workflow --strict`.
- [x] 4.2 Re-run `npx --yes @fission-ai/openspec@latest status --change add-varlock-secret-management-to-pi-workflow` and confirm all artifacts are complete before implementation.
- [x] 4.3 Review the README changes for accurate links, placeholder-only examples, and consistency with the existing optional-tooling style.
