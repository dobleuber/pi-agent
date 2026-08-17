## ADDED Requirements

### Requirement: Already-Spanish final answers bypass translation
The router SHALL bypass final-answer translation when the complete work-model answer has strong evidence of already being Spanish.

#### Scenario: Work model answers in Spanish
- **WHEN** the final assistant answer contains multiple high-confidence Spanish language signals
- **THEN** the router returns the answer unchanged without a degraded warning or translation request

#### Scenario: Work model answers in English
- **WHEN** the final assistant answer does not have strong evidence of Spanish
- **THEN** the router follows the existing final-answer translation flow

#### Scenario: Translator echoes English unchanged
- **WHEN** an English answer is sent for translation and the translator returns identical output
- **THEN** the router retains the `untranslated output` degraded warning
