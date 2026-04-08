<p align="center">
  <a href="./" target="blank"><img src=".github/assets/paw.svg" width="100" alt="Paw Logo" /></a>
</p>

# paw-tools-cli

CLI tools for the Paw ecosystem.

## Requirements

- Node.js >= 24.x
- pnpm >= 10.x
- TypeScript 6.x

## Setup

```bash
pnpm install
```

## Usage

The CLI can be run in development or production mode:

```bash
pnpm run cli:dev    # Development mode (ts-node)
pnpm run cli        # Production mode (compiled)
```

### Binary Command

After building, you can also use the binary command:

```bash
paw-tools <command>
```

## Commands

The CLI provides the following commands:

| Command | Description |
|---------|-------------|
| `paw-tools config` | View and update configuration |
| `paw-tools generate-secret` | Generate secret keys |
| `paw-tools init-project` | Initialize new projects from templates |

## Configuration

Configuration is managed via `config/config.json` with environment variable overrides.

### Default Configuration

```json
{
  "app": {
    "environment": "development",
    "secretKey": "",
    "logger": {
      "level": "debug",
      "tag": false,
      "date": false,
      "format": "pretty"
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development, production, test) |
| `APP_SECRET_KEY` | - | App secret key (optional) |
| `APP_LOGGER_LEVELS` | debug | Logger levels (0-7 or level names) |
| `APP_LOGGER_TAG` | false | Show `[paw-tools]` prefix in logs |
| `APP_LOGGER_DATE` | false | Show timestamps in logs |
| `APP_LOGGER_FORMAT` | pretty | Output format (pretty, json) |

## Development

### Build & Test

```bash
# Install dependencies
pnpm install

# Build (uses SWC compiler)
pnpm run build

# Lint & Format
pnpm run lint       # Biome with auto-fix
pnpm run format    # Biome formatting

# Testing
pnpm run test                    # Unit tests (jest)
pnpm run test:watch              # Watch mode
pnpm run test:cov                # With coverage
pnpm run test:e2e                # E2E tests
pnpm run test:debug              # Debug mode
```

### Additional Scripts

```bash
pnpm run setup:agents      # Sync AI agent configurations
pnpm run generate:secret # Generate secret keys
```

## License

MIT