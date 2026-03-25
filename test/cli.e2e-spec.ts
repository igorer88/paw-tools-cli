import { exec } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const CLI_PATH = join(__dirname, '..', 'dist', 'main.js')

const runCli = async (args: string[], options?: { cwd?: string; env?: NodeJS.ProcessEnv }) => {
  const env = { ...process.env, ...options?.env }
  try {
    const { stdout, stderr } = await execAsync(`node ${CLI_PATH} ${args.join(' ')}`, {
      cwd: options?.cwd,
      env
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    const execError = error as { code?: number; stdout?: string; stderr?: string }
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.code || 1
    }
  }
}

describe('CLI E2E', () => {
  const tempDir = join(__dirname, '__fixtures__', 'cli-e2e')

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('help', () => {
    it('should display help with all commands', async () => {
      const result = await runCli(['--help'])

      expect(result.stdout).toContain('config')
      expect(result.stdout).toContain('init-project')
      expect(result.stdout).toContain('generate-secret')
    })

    it('should display help for specific command', async () => {
      const result = await runCli(['config', '--help'])

      expect(result.stdout).toContain('config')
      expect(result.stdout).toContain('Load and validate CLI configuration')
    })

    it('should display help for init-project', async () => {
      const result = await runCli(['init-project', '--help'])

      expect(result.stdout).toContain('init-project')
      expect(result.stdout).toContain('-d, --defaults')
    })

    it('should display help for generate-secret', async () => {
      const result = await runCli(['generate-secret', '--help'])

      expect(result.stdout).toContain('generate-secret')
      expect(result.stdout).toContain('Generate a random secret key')
    })
  })

  describe('config', () => {
    it('should load existing config file', async () => {
      const configPath = join(tempDir, 'config.json')
      await mkdir(join(tempDir, 'config'), { recursive: true })
      await writeFile(configPath, JSON.stringify({ app: { debug: true } }, null, 2))

      const result = await runCli(['config', '-c', configPath])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Configuration loaded successfully')
    })

    it('should output error message for missing config file', async () => {
      const result = await runCli(['config', '-c', '/non/existent/path.json'])

      expect(result.stderr).toContain('Config file not found')
    })

    it('should output error for invalid JSON', async () => {
      const invalidPath = join(tempDir, 'invalid.json')
      await writeFile(invalidPath, '{ invalid json }')

      const result = await runCli(['config', '-c', invalidPath])

      expect(result.stderr).toContain('JSON')
    })

    it('should use PAW_CONFIG env var', async () => {
      const configPath = join(tempDir, 'env-config.json')
      await writeFile(configPath, JSON.stringify({ app: { debug: true } }))

      const result = await runCli(['config'], { env: { PAW_CONFIG: configPath } })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Configuration loaded successfully')
    })

    it('should prioritize option over PAW_CONFIG env var', async () => {
      const envPath = join(tempDir, 'env-config.json')
      const optionPath = join(tempDir, 'option-config.json')
      await writeFile(envPath, JSON.stringify({ source: 'env' }))
      await writeFile(optionPath, JSON.stringify({ source: 'option' }))

      const result = await runCli(['config', '-c', optionPath], {
        env: { PAW_CONFIG: envPath }
      })

      expect(result.stdout).toContain('option-config.json')
    })
  })

  describe('init-project', () => {
    it.skip('should run with defaults flag (requires TTY for @clack/prompts)', async () => {
      const projectDir = join(tempDir, 'test-project')
      await mkdir(projectDir, { recursive: true })
      await writeFile(
        join(projectDir, 'package.json'),
        JSON.stringify({ name: 'old-name', version: '0.0.1' }, null, 2)
      )

      const result = await runCli(['init-project', '--defaults'], { cwd: projectDir })

      expect(result.exitCode).toBe(0)
    })

    it.skip('should warn when no package.json exists (requires TTY for @clack/prompts)', async () => {
      const projectDir = join(tempDir, 'empty-project')
      await mkdir(projectDir, { recursive: true })

      const result = await runCli(['init-project', '--defaults'], { cwd: projectDir })

      expect(result.stdout).toContain('package.json not found, skipping update')
    })
  })

  describe('generate-secret', () => {
    it('should generate a secret', async () => {
      const result = await runCli(['generate-secret'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim().length).toBeGreaterThan(60)
    })

    it('should output hex secret on success', async () => {
      const result = await runCli(['generate-secret'])

      expect(result.stdout).toMatch(/[✔✓]\s+[a-f0-9]{64}/)
    })
  })
})
