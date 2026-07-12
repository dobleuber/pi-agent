## ADDED Requirements

### Requirement: Intermediate assistant events do not consume pending routed turns
Pi Router SHALL preserve pending routed-turn state across assistant reasoning, commentary, preamble, and tool-call events.

#### Scenario: Commentary precedes tool use
- **WHEN** an assistant event has phase `commentary`
- **THEN** Pi Router MUST leave the pending routed turn queued
- **AND** it MUST preserve the event and its phase unchanged

#### Scenario: Reasoning-only event arrives
- **WHEN** an assistant event contains reasoning content without a final answer
- **THEN** Pi Router MUST NOT complete, skip, or translate the pending turn

#### Scenario: Tool call arrives
- **WHEN** an assistant event contains one or more tool calls
- **THEN** Pi Router MUST leave the pending turn queued for the eventual final answer

### Requirement: Explicit final-answer events complete exactly one routed turn
Pi Router SHALL consume, complete, and optionally translate a pending turn only when an assistant event represents the final answer.

#### Scenario: Final answer follows intermediate events
- **WHEN** commentary, reasoning, or tool-call events occur before an assistant event with phase `final_answer`
- **THEN** the final-answer event MUST consume exactly one pending routed turn
- **AND** earlier intermediate events MUST NOT shift the queue

#### Scenario: Final answer requires Spanish translation
- **WHEN** the consumed routed turn requires translation
- **THEN** Pi Router MUST translate only the visible final-answer text
- **AND** it MUST preserve non-text metadata and the `final_answer` phase

#### Scenario: Final answer does not require translation
- **WHEN** the consumed routed turn does not require translation
- **THEN** Pi Router MUST complete details with identical English and visible answers

#### Scenario: Explicit final answer has unsupported or empty content
- **WHEN** an event explicitly marked `final_answer` cannot provide supported visible text
- **THEN** Pi Router MUST consume and complete the turn with a visible diagnostic fallback event
- **AND** it MUST NOT associate a later answer with the completed turn

### Requirement: Providers without phase metadata use a narrow compatibility fallback
Pi Router SHALL retain compatibility with assistant providers and historical messages that do not expose an assistant phase while avoiding consumption of clearly intermediate events.

#### Scenario: Phase is absent and event is a normal text-only completion
- **WHEN** an assistant event has no phase, has supported non-empty text, and contains no tool calls or intermediate-only content
- **THEN** Pi Router MAY treat it as the final answer

#### Scenario: Phase is absent and content is empty or unsupported
- **WHEN** an assistant event has no phase and lacks supported non-empty final text
- **THEN** Pi Router MUST keep the pending turn queued

### Requirement: Assistant phase metadata is preserved in context and persistence
Pi Router SHALL preserve provider-supplied assistant phase metadata when replacing visible translated text or restoring English work-model context.

#### Scenario: Translated final answer is returned
- **WHEN** Pi Router replaces English text with Spanish text in a `final_answer` message
- **THEN** the returned message MUST retain its original phase, timestamp, and non-text fields

#### Scenario: English context is restored
- **WHEN** completed details restore an English answer in the non-destructive work-model context copy
- **THEN** the context message MUST retain its phase and message identity metadata
