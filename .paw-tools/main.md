# Agent Guidelines for paw-tools-cli

## Project Overview

A NestJS CLI application for the paw ecosystem. Uses TypeScript, pnpm, SWC compiler, and nest-commander.

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Build (uses SWC compiler)
pnpm run build

# Run CLI in development
pnpm run cli:dev
pnpm run cli        # Run compiled CLI

# Lint & Format
pnpm run lint       # ESLint with auto-fix
pnpm run format     # Prettier formatting

# Testing
pnpm run test                    # Unit tests (jest)
pnpm run test -- <pattern>       # Single test file
pnpm run test:watch              # Watch mode
pnpm run test:cov                # With coverage
pnpm run test:e2e                # E2E tests
pnpm run test:debug              # Debug mode
```

## Code Style

### Formatting

- **Indent**: 2 spaces (no tabs)
- **Quotes**: Single quotes
- **Semicolons**: No semicolons
- **Trailing commas**: None
- **Arrow parens**: Avoid when possible
- **End of line**: LF
- **Line length**: No enforced max (let Prettier handle)

### TypeScript Conventions

- `strictNullChecks: false` - nullable types allowed
- `noImplicitAny: false` - any type allowed
- `experimentalDecorators: true` - NestJS decorators enabled
- `emitDecoratorMetadata: true` - reflection metadata enabled
- **Prefer** interfaces over types for object shapes
- **Avoid** `any` type where possible (ESLint will warn)
- **Use** explicit return types on exported functions (warning level)

### Naming Conventions

| Element             | Convention                        | Example                             |
| ------------------- | --------------------------------- | ----------------------------------- |
| Interfaces          | PascalCase, NOT prefixed with `I` | `UserService`                       |
| Classes             | PascalCase                        | `AppModule`, `ClientException`      |
| Variables/Functions | camelCase                         | `getUserById`, `errorMessage`       |
| Constants           | SCREAMING_SNAKE_CASE              | `MAX_RETRY_COUNT`                   |
| Enum members        | SCREAMING_SNAKE_CASE              | `ErrorTypes.INTERNAL_ERROR`         |
| Files (classes)     | kebab-case                        | `base-error.ts`, `error-service.ts` |
| Files (index)       | index.ts                          | Re-export files                     |

### Interface Naming

Interfaces should NOT be prefixed with `I`. The following ESLint rule is enforced:

```typescript
'@typescript-eslint/naming-convention': [
  'error',
  {
    selector: 'interface',
    format: ['PascalCase'],
    custom: { regex: '^I[A-Z]', match: false }  // Reject IUser, IProduct, etc.
  }
]
```

### SOLID Principles

Apply these principles for maintainable, scalable code:

- **S**ingle Responsibility: Each class/service has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Prefer small, focused interfaces over large ones
- **D**ependency Inversion: Depend on abstractions, not concretions

Example of ISP (Interface Segregation):

```typescript
// Instead of one large interface:
interface FileHandler {
  read(): void
  write(): void
  delete(): void
  exists(): boolean
}

// Split into focused interfaces:
interface FileReader { read(): void }
interface FileWriter { write(): void }
interface FileSystem { exists(): boolean }
```

### Import Organization (enforced by `import-x/order`)

Order groups (each group separated by blank line, alphabetically sorted):

1. `node:*` - Node.js built-ins
2. `external` - Third-party packages (e.g., `@nestjs/*`, `class-validator`)
3. `@/**` - Internal imports (`@/shared/*`, `@/config/*`)
4. `parent` / `sibling` - Relative imports
5. `index` - Index re-exports

Example:

```typescript
import { Logger } from '@nestjs/common' // external
import { CommandFactory } from 'nest-commander' // external

import { CliModule } from './cli/cli.module' // sibling
import { AppConfig } from '@/config' // internal (@/)
```

### File Structure

```bash
src/
├── main.ts                 # Entry point
├── app.module.ts           # Root module
├── cli/                    # CLI commands
│   ├── cli.module.ts
│   └── commands/
├── config/                 # Configuration
│   ├── environment/
│   ├── logger/
│   └── enums/
└── shared/                 # Shared utilities
    ├── errors/             # Error handling
    ├── file-handler/       # File operations (see FileHandler Module)
    └── utils.helper.ts
```

### Method Ordering (class organization)

Class members should be ordered:
1. `readonly` properties (injected dependencies)
2. Constructor (dependency injection)
3. Private methods (helpers, business logic)
4. Protected methods (subclass hooks)
5. Public methods (entry points, command handlers) - **LAST**

Example:

```typescript
class MyCommand extends CommandRunner {
  private readonly logger = new Logger(MyCommand.name)
  private readonly fileHandler: FileHandlerService

  constructor() {
    super()
    this.fileHandler = new FileHandlerService()
  }

  private validateInput(): void {}  // Private helpers - ABOVE

  async run(): Promise<void> {}    // Public entry - BELOW
}
```

## Error Handling Patterns

### Exception Hierarchy

```bash
BaseError (abstract)
├── ClientException     # Client-facing errors (4xx)
└── InternalException   # Internal errors (logged, generic response)
```

### Usage

```typescript
// Client errors
throw new ClientException(
  'Validation failed',
  'Email is required',
  HttpStatus.BAD_REQUEST,
  'VALIDATION_ERROR',
  { field: 'email' }
)

// Internal errors
throw new InternalException(
  'External service failed',
  'Payment gateway timeout',
  { service: 'payment' },
  originalError
)
```

### Exception Filter

- Located at `src/shared/errors/exception.filter.ts`
- Stack traces never exposed to clients
- Configurable IP logging (enabled/anonymized/disabled)

## NestJS Conventions

### Modules

```typescript
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: []
})
export class FeatureModule {}
```

### Dependency Injection

- Use constructor injection
- Use `@Inject()` decorator for non-class tokens

### DTOs

- Use `class-validator` decorators for validation
- Use `class-transformer` for transformation

## Git Commit Messages

Follow Conventional Commits (enforced by commitlint):

```bash
feat: add new CLI command
fix: resolve validation error
docs: update README
refactor: simplify error handling
test: add tests for user service
```

## Git Flow Branching Strategy

All PRs target `develop` first. `main` receives releases from `develop`.

### Branch Structure

- **main** - Production-ready releases
- **develop** - Integration branch for all changes
- **fix/** - Bug fixes (e.g., `fix/symlink-path`)
- **feature/** - New features (e.g., `feature/add-auth`)
- **release/** - Release candidates

### Rules

1. **Never merge directly to main** - All changes go to develop first
2. **PRs to develop** - Feature/fix branches merge into develop
3. **Releases** - develop merges into main via release PRs
4. **Hotfixes** - Branch from main, merge to both main and develop

## Pre-commit Hooks

Husky is configured. Run `pnpm prepare` after initial clone to install hooks.

## Key Dependencies

- **@nestjs/core, @nestjs/common**: NestJS framework
- **nest-commander**: CLI command execution
- **class-validator, class-transformer**: DTO validation/transformation
- **joi**: Environment validation
- **jest, ts-jest**: Testing
- **biome**: Code quality (linting and formatting)
- **swc**: Fast TypeScript compilation

## FileHandler Module

All file operations MUST use `FileHandlerService`. Never use `fs` module directly in commands.

### Location

```
src/shared/file-handler/
├── interfaces/
│   ├── file-reader.interface.ts
│   ├── file-writer.interface.ts
│   ├── file-system.interface.ts
│   └── yaml-handler.interface.ts
├── file-handler.service.ts
├── file-handler.module.ts
└── index.ts
```

### Usage

```typescript
import { FileHandlerService } from '@/shared/file-handler'

export class MyCommand extends CommandRunner {
  private readonly fileHandler: FileHandlerService

  constructor() {
    super()
    this.fileHandler = new FileHandlerService()
  }

  async execute() {
    const data = await this.fileHandler.readJson<MyConfig>('config.json')
    await this.fileHandler.writeJson('output.json', data)
  }
}
```

### Available Methods

| Interface | Method | Description |
|-----------|--------|-------------|
| FileReader | `readFile(path, encoding?)` | Read file as string |
| FileReader | `readJson<T>(path)` | Read and parse JSON |
| FileWriter | `writeFile(path, content)` | Write string to file |
| FileWriter | `writeJson(path, data)` | Stringify and write JSON |
| YamlHandler | `readYaml<T>(path)` | Read and parse YAML |
| YamlHandler | `writeYaml(path, data)` | Dump and write YAML |
| FileSystem | `exists(path)` | Check if path exists |
| FileSystem | `ensureDir(path)` | Create directory recursively |
| FileSystem | `createSymlink(source, target, type)` | Create symlink |

### File Structure After Refactor

```
src/shared/file-handler/
├── interfaces/
│   ├── file-reader.interface.ts    # Read operations
│   ├── file-writer.interface.ts    # Write operations
│   ├── file-system.interface.ts    # File system operations
│   ├── yaml-handler.interface.ts   # YAML operations
│   └── index.ts
├── file-handler.service.ts         # Implementation
├── file-handler.module.ts          # NestJS module
└── index.ts                        # Re-exports
```

## ProcessModule

All child process operations MUST use `ProcessService`. Never use `node:child_process` directly in commands.

### Location

```
src/shared/process/
├── interfaces/
│   ├── executor.interface.ts
│   └── index.ts
├── process.service.ts
├── process.module.ts
└── index.ts
```

### Usage

```typescript
import { ProcessService } from '@/shared/process'

export class MyCommand extends CommandRunner {
  private readonly processService: ProcessService

  constructor() {
    super()
    this.processService = new ProcessService()
  }

  async execute() {
    const result = await this.processService.exec('git status')
    if (result.exitCode === 0) {
      console.log(result.stdout)
    }
  }
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `exec(command)` | Execute command asynchronously, returns `{ stdout, stderr, exitCode, error }` |
| `execSync(command)` | Execute command synchronously, returns stdout string |
| `spawn(command, args)` | Spawn a child process, returns ChildProcess |

### Example: Getting Git Author

```typescript
const nameResult = await this.processService.exec('git config --get user.name')
const emailResult = await this.processService.exec('git config --get user.email')
const author = `${nameResult.stdout} <${emailResult.stdout}>`
```

**Do NOT use `node:child_process` directly in commands.**

## Additional Notes

- Tests follow Jest naming: `*.spec.ts`
- Use path alias `@/` for internal imports (mapped to `src/`)
- Environment variables validated with Joi schema
- Secrets should never be logged or committed

## PromptModule

All CLI prompts MUST use `PromptService`. Never use `@clack/prompts` directly in commands. The service handles cancel detection and provides a consistent user experience.

### Location

```
src/shared/prompt/
├── interfaces/
│   ├── text-prompter.interface.ts
│   ├── select-prompter.interface.ts
│   ├── confirm-prompter.interface.ts
│   ├── spinner-prompter.interface.ts
│   └── index.ts
├── prompt.service.ts
├── prompt.module.ts
└── index.ts
```

### Usage

```typescript
import { PromptService } from '@/shared/prompt'

export class MyCommand extends CommandRunner {
  private readonly promptService: PromptService

  constructor() {
    super()
    this.promptService = new PromptService()
  }

  async run() {
    const name = await this.promptService.text({
      message: 'Enter project name:',
      placeholder: 'my-project'
    })

    const type = await this.promptService.select({
      message: 'Select type:',
      options: [
        { value: 'api', label: 'API' },
        { value: 'web', label: 'Web' }
      ]
    })

    const confirm = await this.promptService.confirm({
      message: 'Continue?'
    })
  }
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `text(options)` | Prompt for text input with optional validation |
| `select(options)` | Prompt for single selection from options |
| `confirm(options)` | Prompt for yes/no confirmation |
| `spinner(options, fn)` | Run async function with spinner (auto handles Done/Failed) |
| `spinnerMessage(options)` | Get spinner with manual start/stop control |

### Cancel Handling

All prompts automatically handle user cancellation (Ctrl+C). When cancelled:
1. Displays "Operation cancelled."
2. Exits process with code 0

**Do NOT use `@clack/prompts` directly in commands.**

## Validation Utilities

Shared validation functions for common patterns. Located in `src/shared/utils.helper.ts`.

### Available Functions

| Function | Description |
|----------|-------------|
| `validateKebabCase(value)` | Validates kebab-case (lowercase, numbers, hyphens) |
| `validateSemver(value)` | Validates semver format (x.y.z) |
| `validateCalver(value)` | Validates calver format (YYYY.M.PATCH) |
| `getCalver(date?)` | Returns date in YYYY.MM.DD format (defaults to today) |
| `isEmptyObject(obj)` | Checks if object is empty |

### Usage

```typescript
import { validateKebabCase, validateSemver, validateCalver, getCalver } from '@/shared/utils.helper'

// Validation returns error message or undefined if valid
const nameError = validateKebabCase('My Project')
if (nameError) {
  console.error(nameError) // "Name must be kebab-case (lowercase, numbers, hyphens)"
}

const semverError = validateSemver('1.0')
if (semverError) {
  console.error(semverError) // "Must be semver format (x.y.z)"
}

// Get current date in calver format
const today = getCalver() // "2026.03.24"

// Or for a specific date
const specific = getCalver(new Date('2024-01-15')) // "2024.01.15"
```

## Testing

All test-related files MUST be placed in the `test/` folder. This includes:

- **Unit tests**: `src/**/*.spec.ts` (co-located with source)
- **E2E tests**: `test/*.e2e-spec.ts`
- **Test mocks**: `test/__mocks__/`

### Test Mocks

Mock files for external modules should be in `test/__mocks__/`:

```
test/
├── __mocks__/
│   └── @clack/
│       └── prompts.ts    # Mock for @clack/prompts
├── app.e2e-spec.ts
└── jest-e2e.json
```

The jest config maps mocks to `test/__mocks__/`:
- Unit tests (`jest.config.mjs`): `moduleNameMapper` points to `<rootDir>/../test/__mocks__/`
- E2E tests (`test/jest-e2e.json`): `moduleNameMapper` points to `<rootDir>/__mocks__/`

**Do NOT create mocks in `src/__mocks__/`**. All test mocks belong in `test/__mocks__/`.
