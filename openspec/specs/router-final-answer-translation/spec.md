## Purpose

Define robust Pi router final-answer translation behavior for Spanish/mixed prompts, including preservation of technical content and safe handling of translation-model placeholder artifacts.

## Requirements

### Requirement: Technical-only final-answer chunks are preserved without translation warnings
The router SHALL avoid sending chunks that contain only paths, inline code, command names, or bullet lists of technical identifiers to the final-answer translator.

#### Scenario: Bullet list of paths
- **WHEN** final-answer translation processes a paragraph that is only a bullet list of inline-code paths
- **THEN** the router MUST preserve the paragraph exactly
- **AND** it MUST NOT report `final answer translation unavailable: untranslated output` for that paragraph

#### Scenario: Prose around path lists
- **WHEN** a final answer contains translatable prose before or after a technical-only path list
- **THEN** the router MUST translate the prose chunks
- **AND** it MUST preserve the technical-only path list exactly

### Requirement: Placeholder restoration removes malformed numeric suffixes without corrupting literal examples
The router SHALL restore protected paths and inline-code placeholders even when the translation model emits a placeholder with a malformed numeric suffix, while preserving literal placeholder examples inside inline code.

#### Scenario: Inline placeholder followed by malformed suffix
- **WHEN** the translator returns an inline-code placeholder followed by a malformed suffix such as `__PI_ROUTER_INLINE_0__0__` or `__PI_ROUTER_INLINE_0__3__`
- **THEN** the final answer MUST contain the original inline code span exactly once
- **AND** it MUST NOT contain leaked suffixes such as `0__` or `3__`

#### Scenario: Non-inline protected path followed by malformed suffix
- **WHEN** the translator returns a non-inline protected path placeholder followed by a malformed suffix such as `§P0§3__`
- **THEN** the final answer MUST contain the original protected path exactly once
- **AND** it MUST NOT contain leaked suffixes such as `3__`

#### Scenario: Literal placeholder example inside inline code
- **WHEN** the original final answer includes an inline-code literal example such as `§P0§3__`
- **THEN** the router MUST preserve that literal inline-code example exactly
- **AND** it MUST NOT treat the literal `§P0§` text as a protected path placeholder

#### Scenario: Protected path with line range followed by malformed suffix
- **WHEN** the original path or inline code is a file reference with a line or range suffix
- **THEN** the restored final answer MUST keep the full reference, including line suffix and backticks when originally inline
- **AND** it MUST NOT append any placeholder suffix text

### Requirement: Structured markdown blocks are preserved during final-answer translation
The router SHALL translate normal prose while preserving structured markdown content that is layout-sensitive or technical.

#### Scenario: Fenced code or diagram blocks
- **WHEN** a final answer contains fenced blocks such as ```text, ```gdscript, ```json, or ```diff
- **THEN** the router MUST preserve each fenced block exactly
- **AND** it MUST NOT send fenced block contents or placeholder tokens for fenced blocks to the translator
- **AND** it MUST translate prose before, between, and after those fenced blocks

#### Scenario: ASCII box tables and diagrams
- **WHEN** a final answer contains an ASCII/Unicode box table or diagram outside a fenced block
- **THEN** the router MUST preserve that table or diagram exactly
- **AND** it MUST NOT translate labels inside the table or diagram
- **AND** it MUST translate surrounding prose normally

#### Scenario: Markdown tables
- **WHEN** a final answer contains a Markdown table
- **THEN** the router MUST preserve the table exactly
- **AND** it MUST NOT translate table headers, cells, alignment rows, or separators
- **AND** it MUST translate surrounding prose normally

#### Scenario: Mixed markdown structures
- **WHEN** a final answer contains headings, blockquotes, bullet lists, numbered lists, inline code, paths, commands, fenced blocks, ASCII diagrams, and Markdown tables
- **THEN** the router MUST preserve markdown structure markers such as `#`, `>`, `-`, numbered-list prefixes, table pipes, and fence delimiters
- **AND** it MUST preserve inline code, paths, commands, fenced blocks, ASCII diagrams, and Markdown tables exactly
- **AND** it MUST translate normal prose content where doing so does not alter protected technical or layout-sensitive content

### Requirement: Identical English prose still degrades visibly
The router SHALL continue to treat unchanged English prose as a translation fallback.

#### Scenario: English prose is returned unchanged
- **WHEN** the final-answer translator returns `Done.` for input `Done.`
- **THEN** the router MUST preserve the original answer
- **AND** it MUST report `final answer translation unavailable: untranslated output`

### Requirement: Every protected placeholder is integrity-checked
The router SHALL compare normalized placeholder multisets before accepting normal translation or residual-English repair output.

#### Scenario: Translator drops or duplicates protected content
- **WHEN** output changes the count of an inline-code, protected-path, or fenced-block placeholder
- **THEN** the router MUST reject that output
- **AND** it MUST preserve the original content with a visible degradation reason

#### Scenario: Translator localizes a supported placeholder spelling
- **WHEN** output uses a supported localized placeholder spelling with the same kind, index, and count
- **THEN** the router MAY accept the output and restore the original protected content exactly once
