import { exec } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { cancel, isCancel, spinner, text } from '@clack/prompts'
import { Command, CommandRunner, Option } from 'nest-commander'

interface InitProjectOptions {
  defaults?: boolean
}

interface ProjectConfig {
  name: string
  description: string
  version: string
  author: string
}

@Command({
  name: 'init-project',
  description: 'Initialize project from template'
})
export class InitProjectCommand extends CommandRunner {
  async run(_passedParam: string[], options?: InitProjectOptions): Promise<void> {
    if (options?.defaults) {
      await this.initializeWithDefaults()
    } else {
      await this.initializeInteractive()
    }
  }

  private async initializeWithDefaults(): Promise<void> {
    const s = spinner()
    s.start('Initializing project with defaults...')

    const config = await this.getDefaultConfig()
    await this.updatePackageJson(config)

    s.stop('Project initialized successfully.')
  }

  private async initializeInteractive(): Promise<void> {
    const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

    const name = await text({
      message: 'Enter project name:',
      placeholder: 'my-project',
      defaultValue: 'my-project',
      validate: (value) => {
        if (value.length === 0) return 'Name is required!'
      }
    })
    if (isCancel(name)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const description = await text({
      message: 'Enter project description:',
      placeholder: 'A JavaScript/TypeScript project',
      defaultValue: 'A JavaScript/TypeScript project'
    })
    if (isCancel(description)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const version = await text({
      message: 'Enter project version:',
      placeholder: '1.0.0',
      defaultValue: '1.0.0',
      validate: (value) => {
        if (!/^\d+\.\d+\.\d+$/.test(value)) return 'Version must be semver format (x.y.z)!'
      }
    })
    if (isCancel(version)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const author = await text({
      message: 'Enter project author:',
      placeholder: gitAuthor,
      defaultValue: gitAuthor
    })
    if (isCancel(author)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const config: ProjectConfig = {
      name: name as string,
      description: description as string,
      version: version as string,
      author: author as string
    }

    const s = spinner()
    s.start('Updating package.json...')
    await this.updatePackageJson(config)
    s.stop('Project initialized successfully.')
  }

  private async getDefaultConfig(): Promise<ProjectConfig> {
    const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

    return {
      name: 'my-project',
      description: 'A JavaScript/TypeScript project',
      version: '1.0.0',
      author: gitAuthor
    }
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

  @Option({
    flags: '-d, --defaults',
    description: 'Use default values instead of prompting'
  })
  parseDefaults(): boolean {
    return true
  }
}
