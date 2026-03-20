---
name: nestjs-crud
description: Generate NestJS components using Nest CLI (modules, services, controllers, DTOs, entities, guards, pipes, interceptors)
---

# NestJS CRUD Generation Skill

This skill provides commands to generate NestJS components using the Nest CLI.

## Trigger Keywords

`generate`, `gen`, `create`, `new`

## Usage

When asked to generate NestJS components:

1. **First**: Use NestJsMcp MCP tools if available (they provide better, context-aware code generation)
2. **Fallback**: Use the Nest CLI commands below via the scripts in this skill

## Important

Before generating any component, read the corresponding rule file:

- For **DTOs**: Read `.paw-tools/rules/dtos.md`
- For **Modules**: Read `.paw-tools/rules/modules.md`
- For **Controllers**: Read `.paw-tools/rules/controllers.md`
- For **Services**: Read `.paw-tools/rules/services.md`

## Available Generators

| Component   | Script                                   | Description                                          |
| ----------- | ---------------------------------------- | ---------------------------------------------------- |
| Resource    | `scripts/generate-resource.sh <name>`    | Complete CRUD (module + service + controller + DTOs) |
| Module      | `scripts/generate-module.sh <name>`      | NestJS module                                        |
| Service     | `scripts/generate-service.sh <name>`     | NestJS service                                       |
| Controller  | `scripts/generate-controller.sh <name>`  | NestJS controller                                    |
| Guard       | `scripts/generate-guard.sh <name>`       | NestJS guard                                         |
| Pipe        | `scripts/generate-pipe.sh <name>`        | NestJS pipe                                          |
| Interceptor | `scripts/generate-interceptor.sh <name>` | NestJS interceptor                                   |
| DTO         | `scripts/generate-dto.sh <name>`         | Data Transfer Object                                 |
| Entity      | `scripts/generate-entity.sh <name>`      | TypeORM/Mongoose entity                              |

## Examples

```bash
# Generate a complete CRUD resource
./scripts/generate-resource.sh users

# Generate just a service
./scripts/generate-service.sh users
```

## Notes

- Run `pnpm run lint` and `pnpm run format` after generating files
