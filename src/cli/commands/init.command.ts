import { exec } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import readline from 'node:readline'

import { Command, CommandRunner, Option } from 'nest-commander'

interface InitOptions {
  defaults?: boolean
}

interface ProjectConfig {
  name: string
  description: string
  version: string
  author: string
}

@Command({
  name: 'init',
  description: 'Initialize project from template'
})
export class InitCommand extends CommandRunner {
  private rl: readline.Interface | null = null

  async run(_passedParam: string[], options?: InitOptions): Promise<void> {
    if (options?.defaults) {
      await this.initializeWithDefaults()
    } else {
      await this.initializeInteractive()
    }
  }

  private async initializeWithDefaults(): Promise<void> {
    console.log('Using defaults...')

    const config = await this.getDefaultConfig()
    await this.updatePackageJson(config)

    console.log('Project initialized successfully.')
  }

  private async initializeInteractive(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    try {
      const config = await this.promptForConfig()
      await this.updatePackageJson(config)
      console.log('Project initialized successfully.')
    } finally {
      this.rl.close()
    }
  }

  private async getDefaultConfig(): Promise<ProjectConfig> {
    const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

    return {
      name: 'my-project',
      description: 'A NestJS project',
      version: '1.0.0',
      author: gitAuthor
    }
  }

  private async promptForConfig(): Promise<ProjectConfig> {
    const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

    const name = await this.askQuestion('Enter project name', '')
    const description = await this.askQuestion('Enter project description', '')
    const version = await this.askQuestion('Enter project version', '1.0.0')
    const author = await this.askQuestion('Enter project author', gitAuthor)

    return { name, description, version, author }
  }

  private async askQuestion(query: string, defaultValue: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl!.question(`${query} (current: ${defaultValue}): `, (answer) => {
        resolve(answer.trim() === '' ? defaultValue : answer)
      })
    })
  }

  private async getGitAuthor(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec('git config --get user.name', (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        const name = stdout.trim()
        exec('git config --get user.email', (error, stdout) => {
          if (error) {
            reject(error)
            return
          }
          const email = stdout.trim()
          resolve(`${name} <${email}>`)
        })
      })
    })
  }

  private async updatePackageJson(config: ProjectConfig): Promise<void> {
    const packageJsonPath = join(process.cwd(), 'package.json')

    if (!existsSync(packageJsonPath)) {
      console.warn('package.json not found, skipping update.')
      return
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      packageJson.name = config.name || packageJson.name
      packageJson.description = config.description || packageJson.description
      packageJson.version = config.version || packageJson.version
      packageJson.author = config.author || packageJson.author
      writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    } catch (error) {
      console.error('Failed to update package.json:', error)
    }
  }

  private async checkPackageManagerInstalled(packageManager: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`${packageManager} --version`, (error) => {
        resolve(!error)
      })
    })
  }

  private async installDependencies(packageManager = 'pnpm'): Promise<void> {
    const command = `${packageManager} install`

    if (packageManager !== 'pnpm' && existsSync('pnpm-lock.yaml')) {
      unlinkSync('pnpm-lock.yaml')
    }

    return new Promise((resolve, reject) => {
      exec(command, (error, _stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        if (stderr) {
          reject(new Error(stderr))
          return
        }
        resolve()
      })
    })
  }

  @Option({
    flags: '-d, --defaults',
    description: 'Use default values instead of prompting'
  })
  parseDefaults(): boolean {
    return true
  }
}
