## 1. Regression coverage

- [x] 1.1 Add failing tests for remote-only configuration and legacy state migration.
- [x] 1.2 Add failing tests for removed local commands and leaked `Fix the tests` output.

## 2. Implementation

- [x] 2.1 Collapse router configuration and state to a single remote model.
- [x] 2.2 Remove local lifecycle and command paths.
- [x] 2.3 Remove concrete few-shot messages and add leakage protection.

## 3. Verification and deployment

- [x] 3.1 Run TypeScript and full tests.
- [x] 3.2 Validate OpenSpec, deploy remote-only router, stop stale router-owned local server, and verify runtime state.
