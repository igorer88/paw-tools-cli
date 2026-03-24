// biome-ignore-all lint/suspicious/noConsole: CLI command output

import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { cancel, confirm, isCancel, select, spinner, text } from '@clack/prompts'
import { Command, CommandRunner, Option } from 'nest-commander'
import { isMap, isPair, isScalar, type Pair, parseDocument, type Scalar, type YAMLMap } from 'yaml'

interface InitProjectOptions {
  defaults?: boolean
}

interface ProjectConfig {
  name: string
  description: string
  version: string
  author: string
}

interface DockerConfig {
  serviceName: string
  projectName: string
  imageVersion: string
  packageManager: string
  registryUrl: string
}

@Command({
  name: 'init-project',
  description: 'Initialize project from template'
})
export class InitProjectCommand extends CommandRunner {
  private readonly mainServiceName = 'api'

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

    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')
    if (existsSync(dockerComposePath)) {
      const dockerConfig: DockerConfig = {
        serviceName: config.name,
        projectName: config.name,
        imageVersion: 'latest',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      }
      await this.updateDockerCompose(dockerConfig)
    }

    s.stop('Changes applied:')
    console.log('  ✓ package.json updated')
    if (existsSync(dockerComposePath)) {
      console.log('  ✓ docker-compose.yml updated')
    }
    console.log('\n✔ Project initialized successfully.')
  }

  private async initializeInteractive(): Promise<void> {
    const currentConfig = await this.getCurrentConfig()

    const name = await text({
      message: 'Enter project name:',
      placeholder: currentConfig.name,
      defaultValue: currentConfig.name,
      validate: (value) => {
        if (!value || value.length === 0) return 'Name is required!'
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
          return 'Name must be kebab-case (lowercase, numbers, hyphens)'
        }
      }
    })
    if (isCancel(name)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const description = await text({
      message: 'Enter project description:',
      placeholder: currentConfig.description,
      defaultValue: currentConfig.description
    })
    if (isCancel(description)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const versionFormat = await select({
      message: 'Select version format:',
      options: [
        { value: 'semver', label: 'Semantic (0.1.0)' },
        { value: 'calver', label: 'Calendar (2024.03.1)' },
        { value: 'custom', label: 'Custom (any format)' }
      ]
    })
    if (isCancel(versionFormat)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const version = await text({
      message: 'Enter project version:',
      placeholder: this.getVersionPlaceholder(versionFormat as string),
      defaultValue: this.getVersionDefault(versionFormat as string),
      validate: (value) => this.validateVersion(value, versionFormat as string)
    })
    if (isCancel(version)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const author = await text({
      message: 'Enter project author:',
      placeholder: currentConfig.author,
      defaultValue: currentConfig.author
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

    const dockerConfig = await this.initializeDockerConfig(name as string)

    const changes = this.getConfigChanges(currentConfig, config, dockerConfig)

    if (changes.length > 0) {
      console.log('\nChanges to be applied:')
      for (const change of changes) {
        console.log(`  ${change}`)
      }
    } else {
      console.log('\nNo changes to apply.')
    }

    const shouldWrite = await confirm({
      message: 'Write changes?'
    })

    if (isCancel(shouldWrite) || !shouldWrite) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    if (dockerConfig) {
      const s = spinner()
      s.start('Updating package.json and docker-compose.yml...')
      await this.updatePackageJson(config)
      await this.updateDockerCompose(dockerConfig)
      s.stop('Project initialized successfully.')
    } else {
      const s = spinner()
      s.start('Updating package.json...')
      await this.updatePackageJson(config)
      s.stop('Project initialized successfully.')
    }
  }

  private async initializeDockerConfig(projectName: string): Promise<DockerConfig | null> {
    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')

    if (!existsSync(dockerComposePath)) {
      return null
    }

    const serviceName = await text({
      message: 'Enter Docker service name:',
      placeholder: projectName,
      defaultValue: projectName
    })
    if (isCancel(serviceName)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const imageVersion = await text({
      message: 'Enter Docker image version:',
      placeholder: 'latest',
      defaultValue: 'latest'
    })
    if (isCancel(imageVersion)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const packageManager = await select({
      message: 'Select package manager:',
      options: [
        { value: 'pnpm', label: 'pnpm' },
        { value: 'npm', label: 'npm' },
        { value: 'yarn', label: 'yarn' }
      ]
    })
    if (isCancel(packageManager)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    const registryUrl = 'https://registry.npmjs.org/'

    return {
      serviceName: serviceName as string,
      projectName,
      imageVersion: imageVersion as string,
      packageManager: packageManager as string,
      registryUrl
    }
  }

  private async getCurrentConfig(): Promise<ProjectConfig> {
    const packageJsonPath = join(process.cwd(), 'package.json')

    if (!existsSync(packageJsonPath)) {
      return await this.getDefaultConfig()
    }

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
      const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

      return {
        name: packageJson.name || 'my-project',
        description: packageJson.description || 'A JavaScript/TypeScript project',
        version: packageJson.version || '0.1.0',
        author: gitAuthor
      }
    } catch {
      return await this.getDefaultConfig()
    }
  }

  private async getDefaultConfig(): Promise<ProjectConfig> {
    const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

    return {
      name: 'my-project',
      description: 'A JavaScript/TypeScript project',
      version: '0.1.0',
      author: gitAuthor
    }
  }

  private getConfigChanges(
    current: ProjectConfig,
    updated: ProjectConfig,
    dockerConfig?: DockerConfig | null
  ): string[] {
    const changes: string[] = []

    if (current.name !== updated.name) {
      changes.push(`name: "${current.name}" → "${updated.name}"`)
    }
    if (current.description !== updated.description) {
      changes.push(`description: "${current.description}" → "${updated.description}"`)
    }
    if (current.version !== updated.version) {
      changes.push(`version: "${current.version}" → "${updated.version}"`)
    }
    if (current.author !== updated.author) {
      changes.push(`author: "${current.author}" → "${updated.author}"`)
    }

    if (dockerConfig) {
      changes.push(`docker-service: "${this.mainServiceName}" → "${dockerConfig.serviceName}"`)
      changes.push(
        `docker-image: "${this.mainServiceName}:latest" → "${dockerConfig.projectName}:${dockerConfig.imageVersion}"`
      )
      changes.push(`registry: "${dockerConfig.packageManager.toUpperCase()}_REGISTRY"`)
    }

    return changes
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
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
      packageJson.name = config.name || packageJson.name
      packageJson.description = config.description || packageJson.description
      packageJson.version = config.version || packageJson.version
      packageJson.author = config.author || packageJson.author
      await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    } catch (error) {
      console.error('Failed to update package.json:', error)
    }
  }

  private async updateDockerCompose(config: DockerConfig): Promise<void> {
    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')

    try {
      const fileContents = await readFile(dockerComposePath, 'utf8')
      const doc = parseDocument(fileContents)

      if (!isMap(doc.contents)) {
        console.warn('Invalid docker-compose.yml structure')
        return
      }

      const hasScalarKey = (pair: unknown, key: string): pair is Pair<Scalar<string>, YAMLMap> =>
        isPair(pair) && isScalar(pair.key) && pair.key.value === key

      const servicesPair = doc.contents.items.find((pair) => hasScalarKey(pair, 'services'))
      if (!servicesPair || !isMap(servicesPair.value)) {
        console.warn('services not found in docker-compose.yml')
        return
      }

      const mainServicePair = servicesPair.value.items.find((pair) =>
        hasScalarKey(pair, this.mainServiceName)
      )
      if (!mainServicePair || !isMap(mainServicePair.value)) {
        console.warn(`${this.mainServiceName} service not found in docker-compose.yml`)
        return
      }

      if (isScalar(mainServicePair.key)) {
        mainServicePair.key.value = config.serviceName
      }

      const dockerImage = `${config.projectName}:${config.imageVersion}`
      mainServicePair.value.set('container_name', config.serviceName)
      mainServicePair.value.set('image', dockerImage)

      const buildPair = mainServicePair.value.items.find((pair) => hasScalarKey(pair, 'build'))
      if (buildPair?.value && isMap(buildPair.value)) {
        const argsPair = buildPair.value.items.find((pair) => hasScalarKey(pair, 'args'))
        if (argsPair?.value && isMap(argsPair.value)) {
          const registryArg = `${config.packageManager.toUpperCase()}_REGISTRY`
          argsPair.value.delete('NPM_REGISTRY')
          argsPair.value.delete('YARN_REGISTRY')
          argsPair.value.delete('PNPM_REGISTRY')
          argsPair.value.set(registryArg, config.registryUrl)
        }
      }

      let yamlContent = doc.toString()

      if (!yamlContent.includes('# image: ghcr.io/')) {
        const serviceRegex = new RegExp(`(${config.serviceName}:\\n[\\s\\S]*?image:)([^\\n]+)`, 'g')
        yamlContent = yamlContent.replace(
          serviceRegex,
          `$1$2\n    # For production with GHCR, uncomment and update:\n    # image: ghcr.io/your-username/your-repo:${config.imageVersion}`
        )
      }

      await writeFile(dockerComposePath, yamlContent)
    } catch (error) {
      console.error('Failed to update docker-compose.yml:', error)
    }
  }

  private getVersionPlaceholder(format: string): string {
    switch (format) {
      case 'semver':
        return '0.1.0'
      case 'calver':
        return '2024.03.1'
      case 'custom':
        return 'v1'
      default:
        return '0.1.0'
    }
  }

  private getVersionDefault(format: string): string {
    switch (format) {
      case 'semver':
        return '0.1.0'
      case 'calver': {
        const now = new Date()
        return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.0`
      }
      case 'custom':
        return '1'
      default:
        return '0.1.0'
    }
  }

  private validateVersion(value: string, format: string): string | undefined {
    // Allow empty value - @clack/prompts will use defaultValue
    if (!value || value.length === 0) return undefined

    switch (format) {
      case 'semver':
        if (!/^\d+\.\d+\.\d+/.test(value)) return 'Must be semver format (x.y.z)'
        break
      case 'calver':
        if (!/^\d{4}\.\d{1,2}\.\d+/.test(value)) return 'Must be calver format (YYYY.M.PATCH)'
        break
      case 'custom':
        break
    }
    return undefined
  }

  @Option({
    flags: '-d, --defaults',
    description: 'Use default values instead of prompting'
  })
  parseDefaults(): boolean {
    return true
  }
}
