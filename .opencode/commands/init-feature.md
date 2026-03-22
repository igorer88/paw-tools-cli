---
description: Init NestJs Feature
agent: build
---

# Init Feature Command

The Init Feature command creates a complete NestJS feature with all necessary components.

## Command

`/init-feature`

## Usage

`/init-feature <feature-name>`

## What It Creates

**If `src/domains` exists:**

1. **Entity** - `src/domains/<feature-name>/entities/<feature-name>.entity.ts`
2. **DTOs** - `src/domains/<feature-name>/dto/create-<feature-name>.dto.ts`, `update-<feature-name>.dto.ts`
3. **Module** - `src/domains/<feature-name>/<feature-name>.module.ts`
4. **Service** - `src/domains/<feature-name>/<feature-name>.service.ts`
5. **Controller** - `src/domains/<feature-name>/<feature-name>.controller.ts`
6. **Service Test** - `src/domains/<feature-name>/<feature-name>.service.spec.ts`

**Else if `src/features` exists:**

1. **Entity** - `src/features/<feature-name>/entities/<feature-name>.entity.ts`
2. **DTOs** - `src/features/<feature-name>/dto/create-<feature-name>.dto.ts`, `update-<feature-name>.dto.ts`
3. **Module** - `src/features/<feature-name>/<feature-name>.module.ts`
4. **Service** - `src/features/<feature-name>/<feature-name>.service.ts`
5. **Controller** - `src/features/<feature-name>/<feature-name>.controller.ts`
6. **Service Test** - `src/features/<feature-name>/<feature-name>.service.spec.ts`

**Else (default - no subfolder):**

1. **Entity** - `src/<feature-name>/entities/<feature-name>.entity.ts`
2. **DTOs** - `src/<feature-name>/dto/create-<feature-name>.dto.ts`, `update-<feature-name>.dto.ts`
3. **Module** - `src/<feature-name>/<feature-name>.module.ts`
4. **Service** - `src/<feature-name>/<feature-name>.service.ts`
5. **Controller** - `src/<feature-name>/<feature-name>.controller.ts`
6. **Service Test** - `src/<feature-name>/<feature-name>.service.spec.ts`

**Always:** 7. **E2E Test** - `test/<feature-name>.e2e-spec.ts` 8. **Module Registration** - Register in `domains.module.ts`, `features.module.ts`, or `app.module.ts`

## Steps

1. Read `.paw-tools/rules/dtos.md` before creating DTOs
2. Read `.paw-tools/rules/modules.md` before creating module
3. Read `.paw-tools/rules/services.md` before creating service
4. Read `.paw-tools/rules/controllers.md` before creating controller
5. **Detect target directory**:
   - Check if `src/domains` folder exists
   - Check if `src/features` folder exists
   - If neither exists, **ask user**:
     - "No `domains` or `features` folder found. Where should I create the feature?"
     - Options: "Create `domains` folder", "Create `features` folder", "Use `src` root"
   - Set base path based on user choice
6. **Detect parent module for registration**:
   - Check if `src/domains/domains.module.ts` exists
   - Check if `src/features/features.module.ts` exists
   - If neither exists, **ask user**:
     - "Where should I register this module?"
     - Options: "Create domains.module.ts and register", "Create features.module.ts and register", "Register in app.module.ts"
7. **Generate feature** (priority order):
   - **First**: Try NestJsMCP MCP (if configured in `.paw-tools/mcp.json`)
   - **Second**: Use skill script with `--path`:
     - `.paw-tools/skills/nestjs-crud/scripts/generate-resource.sh <feature-name> --path <relative-base-path>`
   - **Fallback**: Run Nest CLI directly:
     - `pnpm nest g resource <feature-name> --no-spec --path <relative-path>`
8. Create unit test for service using the pattern in existing spec files
9. Create E2E test following pattern in `test/app.e2e-spec.ts`
10. Register module in the appropriate parent module (domains.module.ts, features.module.ts, or app.module.ts)
11. Run `pnpm run lint` and `pnpm run format`

## Example

`/init-feature users`

Creates complete CRUD for users with:

- Entity, DTOs, Module, Service, Controller
- Unit and E2E tests

## Trigger Keywords

`init-feature`, `init`, `new-feature`, `create-feature`, `feature`
