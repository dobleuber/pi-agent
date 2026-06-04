## ADDED Requirements

### Requirement: CodeGraph-first exploration guardrail skill
The pi-agent workflow SHALL provide a focused skill that is triggered before broad manual repository exploration and directs Pi to use CodeGraph first when appropriate.

#### Scenario: Broad repository exploration is about to begin
- **WHEN** Pi is working in a code repository and is about to use `rg`, `find`, or broad file reads to understand, locate, debug, review, refactor, or assess code
- **THEN** Pi MUST apply the CodeGraph-first exploration workflow before performing broad manual exploration

#### Scenario: CodeGraph index already exists
- **WHEN** `.codegraph/` exists in the current repository and Pi needs broad repository understanding
- **THEN** Pi MUST run an appropriate CodeGraph command such as `codegraph context`, `codegraph query`, `codegraph callers`, `codegraph callees`, or `codegraph impact` before broad manual search or reads

#### Scenario: CodeGraph index is missing for significant exploration
- **WHEN** Pi is in a clear code repository without `.codegraph/` and the task requires significant code exploration, architecture analysis, debugging, refactoring, or impact analysis
- **THEN** Pi MUST initialize CodeGraph with `codegraph init -i` before relying on repository-wide search or file-reading exploration

#### Scenario: Manual tools are used after CodeGraph
- **WHEN** CodeGraph has provided initial semantic context or its output is incomplete
- **THEN** Pi MUST use direct file reads, `rg`, `find`, tests, or other project tools only to verify details, fill gaps, or complete implementation work

### Requirement: Global stop-before-grep guidance
The pi-agent global instructions SHALL explicitly require the CodeGraph-first workflow before broad grep, find, or multi-file read exploration in code repositories.

#### Scenario: Global instructions are loaded for a code exploration task
- **WHEN** Pi receives a task requiring repository exploration and global agent instructions are loaded
- **THEN** the instructions MUST direct Pi to use CodeGraph before broad `rg`, `find`, or file-read exploration when CodeGraph is available or should be initialized

#### Scenario: Trivial known-file task
- **WHEN** the user asks for a trivial known-file edit or a non-code task that does not require semantic repository exploration
- **THEN** the global instructions MUST NOT require CodeGraph before the task can proceed
