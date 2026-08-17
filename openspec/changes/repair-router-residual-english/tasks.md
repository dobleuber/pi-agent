## 1. Regression coverage

- [x] 1.1 Add failing tests for slightly modified residual English and multiple failed short fragments.
- [x] 1.2 Assert clean translations add no calls and repair adds at most one call.

## 2. Implementation

- [x] 2.1 Implement local residual-English detection outside protected content.
- [x] 2.2 Implement one whole-answer repair pass with placeholder and language validation.
- [x] 2.3 Return coherent original output when repair fails.

## 3. Verification

- [x] 3.1 Run TypeScript and the complete router suite.
- [x] 3.2 Validate OpenSpec, deploy, and verify the active extension.
