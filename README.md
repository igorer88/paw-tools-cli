<p align="center">
  <a href="./" target="blank"><img src=".github/assets/paw.svg" width="100" alt="Paw Logo" /></a>
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

  <p align="center">Paw is a production-ready NestJS template designed for building enterprise-level secure and scalable APIs.</p>
    <p align="center">
<a href="https://nodejs.org" target="_blank"><img src="https://img.shields.io/badge/node-%3E%3D24.x-green.svg" alt="Node.js version" /></a>
<a href="https://pnpm.io" target="_blank"><img src="https://img.shields.io/badge/pnpm-%3E%3D10.x-cc00ff.svg" alt="pnpm version" /></a>
<a href="./LICENSE" target="_blank"><img src="https://img.shields.io/github/license/igorer88/nestjs-paw-template" alt="Package License" /></a>
</p>

## Description

A production-ready [NestJS](https://github.com/nestjs/nest) base template for building scalable server-side applications. Pre-configured with TypeORM (PostgreSQL/SQLite), SWC compiler, Swagger documentation, E2E tests, security (Helmet, rate limiting), and centralized error handling. Uses pnpm as the package manager.

## Features

- **Database**: TypeORM with PostgreSQL and SQLite support
- **Build**: SWC compiler for fast compilation
- **API Docs**: Swagger/OpenAPI at `/docs`
- **Security**: Helmet for HTTP headers, rate limiting
- **Caching**: Built-in caching support
- **Testing**: Jest with unit and E2E tests
- **Error Handling**: Centralized error handling with custom exceptions
- **Validation**: class-validator and Joi for DTO validation
- **Versioning**: URI-based API versioning

## Security

### Known Vulnerabilities

| CVE            | Package                      | Severity | Status             |
| -------------- | ---------------------------- | -------- | ------------------ |
| CVE-2025-69873 | ajv@8.17.1 (via @nestjs/cli) | Moderate | No patch available |

> **Note**: This vulnerability is in `ajv@8.17.1`, a transitive dependency of `@nestjs/cli` (used only in development). It does not affect production deployments. The fix requires updating `fork-ts-checker-webpack-plugin` or waiting for NestJS to update their dependencies. Overriding ajv to version 8.18.0 conflicts with eslint@10 which requires ajv@6.x. For more details, see [CVE-2025-69873](https://github.com/ajv-validator/ajv/issues/2581).

## Project setup

```bash
$ pnpm install
```

## Environment Setup

Copy the example environment file and configure your variables:

```bash
$ cp .env.example .env
```

### Generate API_SECRET_KEY

Generate a secure secret key for the application:

```bash
$ pnpm run generate:secret
```

Copy the generated key and set it as `API_SECRET_KEY` in your `.env` file.

## Database Configuration

This project supports SQLite (default) and PostgreSQL. Configure via the `DB_DRIVER` environment variable.

### SQLite (Default)

```bash
DB_DRIVER=sqlite
DB_SQLITE_PATH=config/db/db.sqlite3
```

### PostgreSQL

```bash
DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-password
```

### Run Migrations

Migrations are handled via TypeORM CLI.

```bash
# Generate migration (after creating/modifying entities)
$ pnpm migration:generate src/database/migrations/MigrationName

# Run pending migrations
$ pnpm migration:run

# Revert last migration (if needed)
$ pnpm migration:revert
```

> **Important**: Ensure `config/db/` folder exists for SQLite before running migrations.

### First Run

On a fresh database, run `pnpm migration:run` - it will create the `_migrations` table and run any pending migrations.

> **Note**: You must have entities defined in `src/` (any subdirectory) before generating migrations. TypeORM automatically finds files matching `*.entity.ts` pattern.

## Docker

Run the project with PostgreSQL using Docker:

```bash
# Start the containers
$ docker-compose up -d

# Stop the containers
$ docker-compose down
```

The API will be available at `http://localhost:3000` and PostgreSQL at port `5432`.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## API Documentation

Swagger documentation is available at `http://localhost:3000/docs` when the application is running.

## Error Handling

This template includes a centralized error handling system for consistent API responses.

### Architecture

```
Exception → AllExceptionsFilter → ErrorService → ClientException → Response
                                    ↓
                              [External Monitoring Tools]
```

### Key Components

| Component             | File                                    | Purpose                      |
| --------------------- | --------------------------------------- | ---------------------------- |
| `AllExceptionsFilter` | `src/shared/errors/exception.filter.ts` | Global exception catcher     |
| `ErrorService`        | `src/shared/errors/error.service.ts`    | Formats and processes errors |
| `ClientException`     | `src/shared/errors/client.exception.ts` | Custom exception class       |
| `BaseError`           | `src/shared/errors/base.error.ts`       | Error interface              |

### Error Response Format

```json
{
  "path": "/api/v1/users",
  "statusCode": 400,
  "message": "Validation failed",
  "details": "...",
  "timestamp": "2026-03-17T12:00:00.000Z"
}
```

### Security

- **Stack traces**: Never exposed to clients (development logs only)
- **Production**: Clean error messages without internal details
- **Development**: Full error details for debugging
- **IP Address Handling**: Configurable via `IP_LOG_LEVEL` environment variable
  - `enabled`: Full IP logged
  - `anonymized`: Masked (e.g., `192.168.x.x`) - default
  - `disabled`: IP not logged

### Adding Custom Errors

Use `ClientException` for service-level errors:

```typescript
throw new ClientException(
  'Error message',
  'Detailed info',
  HttpStatus.BAD_REQUEST,
  'ERROR_CODE',
  { context: '...' }
)
```

### Internal Errors (Experimental)

> ⚠️ **Experimental**: This feature is subject to change.

Internal errors are meant for business logic errors that occur within the API but should not be exposed to clients. This is especially useful for microservices where service-to-service communication differs from the public HTTP API.

**Use case**: Integration with external services that may fail, but the API should return a clean response to the client.

```typescript
throw new InternalException(
  'External service unavailable',
  'EXTERNAL_SERVICE_ERROR',
  originalException,
  stackTrace,
  { service: 'payment-gateway' }
)
```

**Behavior**:

- **Internal**: Logs full error for debugging
- **Client response**: Translated to appropriate HTTP status
- **Stack traces**: Preserved for monitoring tools, never sent to client

### Database Constraint Handling

When adding entities with unique constraints (e.g., email, username, phone), implement constraint error handling:

1. Define constraint names in `src/shared/errors/enums/database-errors.enum.ts`
2. Add handling logic in `src/shared/errors/database-errors.service.ts`

Example constraints: `UQ_EMAIL_ADDRESS`, `UQ_USERNAME`, `UQ_PHONE_NUMBER`

### External Monitoring Integration

The exception filter provides a clean integration point for external monitoring tools like Sentry, Datadog, or New Relic:

```typescript
// src/shared/errors/exception.filter.ts
async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
  const clientException = await this.errorService.handleException(exception)

  /**
   * Capture exception with full context for monitoring tools
   * monitor.captureException(exception, { extra: { ... } })
   */

  // configurable IP logging (enabled, masked, disabled)
  clientException.logError(request.ip)

  const errorResponse: ErrorResponse = {
    path: request.url,
    statusCode: clientException.getStatus(),
    message: clientException.message || 'Internal server error',
    details: clientException.details || '',
    timestamp: new Date().toISOString()
  }

  response.status(clientException.getStatus()).json(errorResponse)
}
```

Stack traces are automatically captured by monitoring tools while clients receive clean responses.

## Linting and Formatting

```bash
# lint
$ pnpm run lint

# format
$ pnpm run format
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## License

This project is [MIT licensed](./LICENSE).
