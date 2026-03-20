# Agent Configuration

## Biome Configuration

### Commands

- `pnpm lint` - Lint and fix code
- `pnpm format` - Format code

### Configuration

See `biome.json` for full configuration.

### Configuration Details

```json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "trailingCommas": "none",
    "quoteStyle": "single"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "none",
      "semicolons": "asNeeded"
    }
  },
  "linter": {
    "recommended": true,
    "style": { "noNamespace": "off" },
    "suspicious": { "noConsole": "warn" }
  }
}
```

### Rules Not Covered by Biome

The following rules from ESLint are not available in Biome and should be enforced manually or through additional tooling:

#### Global/Node.js Preferences

- [ ] `prefer-global/buffer` - Use `node:buffer` instead of `Buffer`
- [ ] `prefer-global/console` - Use `node:console` instead of `console`
- [ ] `prefer-global/process` - Use `node:process` instead of `process`
- [ ] `prefer-global/url` - Use `node:url` instead of `URL`
- [ ] `prefer-global/url-search-params` - Use `node:url-search-params` instead of `URLSearchParams`

#### Promise-based APIs

- [ ] `prefer-promises/dns` - Use promise-based DNS APIs
- [ ] `prefer-promises/fs` - Use promise-based FS APIs

#### Naming Conventions

- [ ] `naming-convention` - No interface `I`-prefix enforcement
- [ ] `camelcase` - No enforced camelCase for variables/properties

#### TypeScript Specific

- [ ] `explicit-function-return-type` - No enforced return types on functions
- [ ] `explicit-module-boundary-types` - No enforced parameter/return types on exported functions
- [ ] `no-explicit-any` - Biome allows `any` type (use with caution)

#### Import Organization

- [ ] Import sorting is handled by `organizeImports` in biome
- [ ] Group imports (external, internal, relative) - Not enforced

### Migration Notes

- Biome formatter is ~97% compatible with Prettier
- Some formatting differences in edge cases (~4%)
- Run `pnpm biome format --write .` once after migration to normalize formatting
- Console warnings (`noConsole`) are set to `warn` level, not error - CLI tools may use `console`

### Verification Checklist

After implementation, verify:

- [ ] `pnpm lint` passes without errors
- [ ] `pnpm format` formats correctly
- [ ] `pnpm test` passes
- [ ] `pnpm test:e2e` passes
- [ ] `pnpm build` compiles
- [ ] `pnpm cli --help` works
- [ ] `pnpm cli:dev --help` works
