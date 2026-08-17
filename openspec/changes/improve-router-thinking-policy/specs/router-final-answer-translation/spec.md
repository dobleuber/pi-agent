## ADDED Requirements

### Requirement: Spanish and mixed source language force visible final translation
Pi Router SHALL force `translateFinalAnswer` to `true` whenever normalized `sourceLanguage` is `es` or `mixed`, regardless of a contradictory router-model boolean.

#### Scenario: Spanish classification contradicts translation flag
- **WHEN** GPT Mini returns `sourceLanguage: es` and `translateFinalAnswer: false`
- **THEN** Pi Router MUST normalize `translateFinalAnswer` to `true`
- **AND** the visible final answer MUST enter the Spanish translation pipeline
- **AND** router details MUST record the normalization

#### Scenario: Mixed-language classification contradicts translation flag
- **WHEN** GPT Mini returns `sourceLanguage: mixed` and `translateFinalAnswer: false`
- **THEN** Pi Router MUST normalize `translateFinalAnswer` to `true`

#### Scenario: English source language does not require translation
- **WHEN** normalized `sourceLanguage` is `en`
- **THEN** Pi Router MAY preserve `translateFinalAnswer: false`

#### Scenario: Unknown source language
- **WHEN** normalized `sourceLanguage` is `unknown`
- **THEN** Pi Router MUST use the router-model translation flag with a documented conservative default
- **AND** it MUST record that the source-language invariant could not decide the value
