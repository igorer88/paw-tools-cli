<p align="center">
  <a href="./" target="blank"><img src=".github/assets/paw.svg" width="100" alt="Paw Logo" /></a>
</p>

# paw-tools-cli

CLI tools for the Paw ecosystem.

## Requirements

- Node.js >= 24.x
- pnpm >= 10.x

## Setup

```bash
pnpm install
```

## Configuration

Configuration is managed via `config/config.json` with environment variable overrides.

### Default Configuration

```json
{
  "app": {
    "environment": "development",
    "debug": false,
    "secretKey": "",
    "loggerLevels": ["log", "error", "warn", "debug", "verbose", "fatal"]
  }
}
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment (development, production, test) |
| `DEBUG` | false | Enable debug mode |
| `APP_SECRET_KEY` | - | App secret key (optional) |
| `APP_LOGGER_LEVELS` | log,error,warn,debug,verbose,fatal | Logger levels |

## Commands

```bash
pnpm cli:dev    # Development mode (ts-node)
pnpm cli        # Production mode (compiled)
```

## License

MIT
