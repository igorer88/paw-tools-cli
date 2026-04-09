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

### Config Command Options

| Option | Description |
|--------|-------------|
| `paw-tools config` | Load and validate config file |
| `paw-tools config -c <path>` | Load config from custom path |
| `paw-tools config -l` / `--list` | List all config values |
| `paw-tools config -g <key>` / `--get <key>` | Get specific config value (e.g., `app.logger.level`) |
| `paw-tools config -s <key>=<value>` / `--set <key>=<value>` | Set config value in file |
| `paw-tools config --validate` | Validate config without loading |
| `paw-tools config -e` / `--export` | Export default config template |
| `PAW_CONFIG=<path> paw-tools config` | Use env var for config path |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development, production, test) - CLI-only, not in config |
| `APP_SECRET_KEY` | - | App secret key (optional) |
| `APP_LOGGER_LEVELS` | debug | Logger levels (0-7 or level names) |
| `APP_LOGGER_TAG` | false | Show `[paw-tools]` prefix in logs |
| `APP_LOGGER_DATE` | false | Show timestamps in logs |
| `APP_LOGGER_FORMAT` | pretty | Output format (pretty, json) |
| `PAW_CONFIG` | - | Custom config file path |

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