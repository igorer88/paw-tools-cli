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
    └── utils.helper.ts
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

## Pre-commit Hooks

Husky is configured. Run `pnpm prepare` after initial clone to install hooks.

## Key Dependencies

- **@nestjs/core, @nestjs/common**: NestJS framework
- **nest-commander**: CLI command execution
- **class-validator, class-transformer**: DTO validation/transformation
- **joi**: Environment validation
- **jest, ts-jest**: Testing
- **eslint, prettier**: Code quality
- **swc**: Fast TypeScript compilation

## Additional Notes

- Tests follow Jest naming: `*.spec.ts`
- Use path alias `@/` for internal imports (mapped to `src/`)
- Environment variables validated with Joi schema
- Secrets should never be logged or committed
