## ADDED Requirements

### Requirement: English work-model history
The router SHALL restore recorded English assistant answers in the non-destructive context copy sent to the work model while retaining Spanish translations in the visible persisted session.

#### Scenario: Translated assistant answer is reused in a later turn
- **WHEN** a visible Spanish assistant message exactly matches a completed router detail containing English and Spanish answers
- **THEN** the context event supplies the recorded English answer to the work model
- **AND** the visible session message remains Spanish

#### Scenario: Session is reloaded or resumed
- **WHEN** completed router details exist in the active session branch
- **THEN** the router reconstructs answer pairs from those persisted entries without relying on in-memory state

#### Scenario: Assistant message has no matching router detail
- **WHEN** an assistant message does not exactly match a recorded Spanish answer
- **THEN** the router leaves that context message unchanged
