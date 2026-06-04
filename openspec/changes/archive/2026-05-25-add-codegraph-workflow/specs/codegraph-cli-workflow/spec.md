## ADDED Requirements

### Requirement: Global CodeGraph CLI availability
The pi-agent setup SHALL provide installation and verification instructions that make the `codegraph` CLI globally available to Pi sessions.

#### Scenario: CodeGraph CLI is installed
- **WHEN** the user follows the documented installation workflow
- **THEN** `codegraph --version` MUST run successfully from a normal shell

#### Scenario: CodeGraph CLI is unavailable
- **WHEN** Pi attempts to use CodeGraph and the `codegraph` executable is not available
- **THEN** Pi MUST report that CodeGraph is unavailable and fall back to normal repository exploration tools

### Requirement: Automatic CodeGraph initialization for code repositories
Pi workflow guidance SHALL instruct the assistant to initialize CodeGraph automatically with `codegraph init -i` before significant code exploration when the current working directory is a code repository without `.codegraph/`.

#### Scenario: Code repository lacks CodeGraph index
- **WHEN** Pi is asked to perform significant code exploration, architecture analysis, debugging, refactoring, or impact analysis in a code repository without `.codegraph/`
- **THEN** Pi MUST run `codegraph init -i` before relying on repository-wide search or file-reading exploration

#### Scenario: Directory is not clearly a code repository
- **WHEN** the current directory does not clearly contain a code project
- **THEN** Pi MUST NOT automatically create `.codegraph/` without user confirmation

#### Scenario: CodeGraph index already exists
- **WHEN** `.codegraph/` exists in the current repository
- **THEN** Pi MUST NOT run `codegraph init -i` again unless initialization appears broken or the user requests reinitialization

### Requirement: Prefer CodeGraph for semantic code exploration
Pi workflow guidance SHALL instruct the assistant to prefer CodeGraph CLI commands over raw grep/read exploration when a `.codegraph/` index exists.

#### Scenario: Architecture or feature understanding task
- **WHEN** the user asks how an area of the codebase works and `.codegraph/` exists
- **THEN** Pi MUST use `codegraph context "<task>"` before starting broad `rg`, `find`, or file-read exploration

#### Scenario: Symbol lookup task
- **WHEN** the user asks where a symbol, function, class, route, or handler is defined and `.codegraph/` exists
- **THEN** Pi MUST use `codegraph query "<symbol>"` or another appropriate CodeGraph command before broad text search

#### Scenario: Call flow or impact task
- **WHEN** the user asks about callers, callees, call flow, or change impact and `.codegraph/` exists
- **THEN** Pi MUST use `codegraph callers`, `codegraph callees`, or `codegraph impact` as appropriate before broad manual exploration

#### Scenario: CodeGraph output is incomplete
- **WHEN** CodeGraph output does not answer a specific detail needed for the task
- **THEN** Pi MAY use `rg`, `find`, and file reads to verify or supplement the CodeGraph result

### Requirement: On-demand CodeGraph synchronization
Pi workflow guidance SHALL instruct the assistant to run `codegraph sync` when the CodeGraph index may be stale before tasks that depend on current repository structure.

#### Scenario: Significant analysis after file changes
- **WHEN** the task requires current semantic code information and repository files may have changed since the last index update
- **THEN** Pi MUST run `codegraph sync` before using CodeGraph results for analysis, debugging, refactoring, or impact assessment

#### Scenario: Branch changed recently
- **WHEN** the assistant knows or detects that the repository branch changed since the index was last used
- **THEN** Pi MUST run `codegraph sync` before using CodeGraph results

#### Scenario: Trivial task does not need repository-wide context
- **WHEN** the user asks for a trivial edit or non-code task that does not require semantic repository exploration
- **THEN** Pi SHOULD NOT run `codegraph sync` solely because `.codegraph/` exists

### Requirement: Optional per-repository Git hook synchronization
The pi-agent setup SHALL provide an opt-in way to install repository-local Git hooks that keep CodeGraph indexes fresh after branch and history changes.

#### Scenario: Hooks are installed in a repository with CodeGraph initialized
- **WHEN** the user enables CodeGraph hooks for a repository that contains `.codegraph/`
- **THEN** `post-checkout`, `post-merge`, and `post-rewrite` hooks MUST run `codegraph sync` defensively after Git changes

#### Scenario: Hooks run without CodeGraph installed
- **WHEN** a CodeGraph hook runs and `codegraph` is not available on `PATH`
- **THEN** the hook MUST exit successfully without blocking the Git operation

#### Scenario: Hooks run before repository initialization
- **WHEN** a CodeGraph hook runs in a repository without `.codegraph/`
- **THEN** the hook MUST exit successfully without creating an index or blocking the Git operation

#### Scenario: Affected tests helper is enabled
- **WHEN** optional pre-commit affected-test support is enabled
- **THEN** the hook SHOULD use `codegraph affected` to report impacted tests from staged or changed files without blocking commits by default

### Requirement: Generated index directories remain untracked
The pi-agent workflow SHALL treat `.codegraph/` directories as generated local state and SHALL document that project repositories should ignore them unless explicitly choosing otherwise.

#### Scenario: CodeGraph initializes a project
- **WHEN** `codegraph init -i` creates `.codegraph/` in a repository
- **THEN** the workflow MUST ensure the user is informed that `.codegraph/` is generated local state and should normally be ignored by version control

#### Scenario: Project deliberately tracks CodeGraph artifacts
- **WHEN** a project explicitly chooses to commit any CodeGraph artifacts
- **THEN** the workflow MUST defer to that project's documented repository policy
