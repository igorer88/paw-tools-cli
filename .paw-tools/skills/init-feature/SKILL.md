---
name: init-feature
description: Generate a complete NestJS feature with all necessary components following the init-feature command specification
---

# Init Feature Skill

This skill generates a complete NestJS feature with Entity, DTOs, Module, Service, Controller, and tests.

## Trigger Keywords

`init-feature`, `init`, `new-feature`, `create-feature`, `feature`

## CRITICAL: Step Enforcement

**You MUST follow these steps in exact order. Do NOT skip any step.**

---

## Step 1: Read Rule Files (BEFORE generating)

Read the following files before creating any components:

- `.paw-tools/rules/dtos.md` - For DTO creation
- `.paw-tools/rules/modules.md` - For Module creation
- `.paw-tools/rules/services.md` - For Service creation
- `.paw-tools/rules/controllers.md` - For Controller creation

---

## Step 2: Detect Target Directory (Step 5 - REQUIRED)

**THIS STEP IS MANDATORY. You must determine the target directory BEFORE any generation.**

Check which directory structure exists:

1. First, check if `src/domains` folder exists
2. If not, check if `src/features` folder exists

**If NEITHER exists, you MUST ask the user:**

> "No `domains` or `features` folder found. Where should I create the feature?"
>
> - Options: "Create `domains` folder", "Create `features` folder", "Use `src` root"

**Set base path based on user choice:**

- `domains` choice → `src/domains/<feature-name>`
- `features` choice → `src/features/<feature-name>`
- `src` root choice → `src/<feature-name>`

---

## Step 3: Detect Parent Module (Step 6 - REQUIRED)

**THIS STEP IS MANDATORY. You must determine where to register the module BEFORE generation.**

Check which parent module exists:

1. First, check if `src/domains/domains.module.ts` exists
2. If not, check if `src/features/features.module.ts` exists
3. If neither exists, default to `src/app.module.ts`

**If NEITHER domains.module.ts NOR features.module.ts exists, you MUST ask the user:**

> "Where should I register this module?"
>
> - Options: "Create domains.module.ts and register", "Create features.module.ts and register", "Register in app.module.ts"

**This determines:**

- Which module file to create/update
- The import/register strategy

---

## Step 4: Generate Feature

**Priority order for generation:**

1. **First**: Try NestJsMCP MCP (if configured in `.paw-tools/mcp.json`)
2. **Second**: Use skill script:
   - `.paw-tools/skills/nestjs-crud/scripts/generate-resource.sh <feature-name> --path <relative-base-path>`
3. **Fallback**: Run Nest CLI directly:
   - `pnpm nest g resource <feature-name> --no-spec --path <relative-path>`

---

## Step 5: Fix Generated Code (REQUIRED - Before tests & lint)

**You MUST fix all code style issues BEFORE creating tests or running lint/format.**

### 5.1 Entity - Use UUID for ID

In `entities/<feature-name>.entity.ts`:

- Change `id: number` to `id: string` (UUID)
- Use `@PrimaryGeneratedColumn('uuid')` instead of `@PrimaryGeneratedColumn()`

### 5.2 DTOs - Validation + Swagger

In `dto/create-<feature-name>.dto.ts` and `dto/update-<feature-name>.dto.ts`:

- Read `.paw-tools/rules/dtos.md` first
- Add `class-validator` decorators: `@IsString()`, `@IsEmail()`, `@IsOptional()`, `@MinLength()`, etc.
- Add Swagger decorators: `@ApiProperty()`, `@ApiPropertyOptional()`
- Add `@Type()` from `class-transformer` if needed for transformation

### 5.3 Service - Fix Code Style Warnings

In `<feature-name>.service.ts`:

- Read `.paw-tools/rules/services.md` first
- Add explicit return types to all methods
- Prefix unused parameters with underscore: `_paramName`
- Fix any linting warnings

### 5.4 Controller - Add Swagger Decorators

In `<feature-name>.controller.ts`:

- Read `.paw-tools/rules/controllers.md` first
- Add `@ApiTags('<feature-name>')` to the controller class
- Add `@ApiOperation()`, `@ApiResponse()` to each endpoint
- Add `@ApiProperty()` or `@ApiPropertyOptional()` to params/body DTOs
- Add explicit return types to all methods

### 5.5 Update Tests for UUID

- Update unit test and E2E test to use UUID strings instead of number IDs

---

## Step 6: Create Unit Test

Create `src/domains/<feature-name>/<feature-name>.service.spec.ts` (or appropriate path based on Step 2)

Follow the pattern in existing spec files like:

- `src/config/health-check/health-check.service.spec.ts`

**Required format:**

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'

import { <FeatureName>Service } from './<feature-name>.service'

const mockDataSource = {
  query: jest.fn()
}

describe('<FeatureName>Service', () => {
  let <featureName>Service: <FeatureName>Service

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <FeatureName>Service,
        {
          provide: DataSource,
          useValue: mockDataSource
        }
      ]
    }).compile()

    <featureName>Service = module.get<<FeatureName>Service>(<FeatureName>Service)
  })

  it('should be defined', () => {
    expect(<featureName>Service).toBeDefined()
  })
})
```

---

## Step 7: Create E2E Test

Create `test/<feature-name>.e2e-spec.ts`

Follow the pattern in `test/app.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { <FeatureName>Module } from './../src/<path-to-module>'
import { setup } from './../src/setup'
import { Environment } from './../src/config'

describe('<FeatureName>Controller (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [<FeatureName>Module]
    }).compile()

    app = moduleFixture.createNestApplication()
    setup(app, Environment.Development)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('<Feature> CRUD', () => {
    it('/v1/<feature-name> (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/<feature-name>')
        .expect(200)
    })
  })
})
```

---

## Step 8: Register Module (Step 10 - REQUIRED)

Based on Step 3, register the module in the appropriate parent:

- `domains.module.ts` → import DomainsModule
- `features.module.ts` → import FeaturesModule
- `app.module.ts` → import directly

---

## Step 9: Lint and Format (Step 11)

Run after all files are created:

```bash
pnpm run lint
pnpm run format
```

---

## Checklist (Complete Before Generation)

- [ ] Read `.paw-tools/rules/dtos.md`
- [ ] Read `.paw-tools/rules/modules.md`
- [ ] Read `.paw-tools/rules/services.md`
- [ ] Read `.paw-tools/rules/controllers.md`
- [ ] Check for `src/domains` folder (Step 5)
- [ ] Check for `src/features` folder (Step 5)
- [ ] Ask user if neither exists (Step 5)
- [ ] Set base path based on folder detection (Step 5)
- [ ] Check for `domains.module.ts` (Step 6)
- [ ] Check for `features.module.ts` (Step 6)
- [ ] Ask user if neither exists (Step 6)
- [ ] Determine parent module for registration (Step 6)
- [ ] Generate feature (Step 4)

### Post-Generation Checklist (Complete BEFORE tests & lint)

- [ ] Fix entity ID to use UUID (Step 5.1)
- [ ] Add validation decorators to DTOs (Step 5.2)
- [ ] Add Swagger decorators to DTOs (Step 5.2)
- [ ] Fix service code style warnings (Step 5.3)
- [ ] Add Swagger decorators to controller (Step 5.4)
- [ ] Update tests for UUID (Step 5.5)

### Final Steps

- [ ] Create unit test (Step 6)
- [ ] Create E2E test (Step 7)
- [ ] Register module (Step 8)
- [ ] Run lint (Step 9) - MUST pass with no errors
- [ ] Run format (Step 9)

**Do NOT proceed to Step 6 until Step 5 is complete.**
**Do NOT run lint until Step 5 is complete.**
