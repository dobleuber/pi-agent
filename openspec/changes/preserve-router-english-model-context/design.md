## Context

Input routing translates Spanish prompts to English, but final-answer translation replaces the finalized assistant message with Spanish. Pi persists that replacement and includes it in later model context. Completed `pi-router-details` entries already preserve both English and Spanish answers.

## Goals / Non-Goals

**Goals:**
- Keep visible assistant history in Spanish.
- Present English assistant history to the work model before each call.
- Preserve behavior across reloads and resumed sessions.
- Avoid retranslating answers that already arrive in Spanish.

**Non-Goals:**
- Rewriting persisted session messages.
- Changing tool-result content or user-visible translations.
- Adding a general-purpose language-detection dependency.

## Decisions

1. Register a `context` handler that reads completed `pi-router-details` entries from the active session branch, builds exact Spanish-to-English answer pairs, and replaces matching assistant text only in the event's copied messages.
2. Match complete assistant text exactly. This avoids altering unrelated Spanish messages or partial content and is deterministic across reloads.
3. Evaluate the complete answer before masking/chunking. A conservative Spanish-language score based on accented characters and common function words bypasses translation only when evidence is strong.
4. Keep the existing identical-output rejection for English input, preserving detection of genuine translator echoes.

## Risks / Trade-offs

- [Two translated answers have identical Spanish text but different English originals] → Resolve pairs in persisted order while walking messages in order.
- [Language heuristic misclassifies technical or mixed prose] → Require multiple high-confidence Spanish signals; uncertain text follows existing translation behavior.
- [Older sessions lack completed router details] → Leave unmatched messages unchanged rather than guessing.
