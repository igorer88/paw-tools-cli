import { join } from 'node:path'

import { Command, CommandRunner, Option } from 'nest-commander'
import { isMap, isPair, isScalar, type Pair, parseDocument, type Scalar, type YAMLMap } from 'yaml'

import { ConsoleService } from '@/shared/console'
import { FileHandlerService } from '@/shared/file-handler'
import { ProcessService } from '@/shared/process'
import { PromptService } from '@/shared/prompt'
import { getCalver, validateCalver, validateKebabCase, validateSemver } from '@/shared/utils.helper'

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
  private readonly fileHandler: FileHandlerService
  private readonly processService: ProcessService
  private readonly promptService: PromptService
  private readonly consoleService: ConsoleService

  constructor() {
    super()
    this.fileHandler = new FileHandlerService()
    this.processService = new ProcessService()
    this.promptService = new PromptService()
    this.consoleService = new ConsoleService()
  }

  private getVersionPlaceholder(format: string): string {
    switch (format) {
      case 'semver':
        return '0.1.0'
      case 'calver':
        return getCalver()
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
      case 'calver':
        return getCalver()
      case 'custom':
        return '1'
      default:
        return '0.1.0'
    }
  }

  private validateVersion(value: string, format: string): string | undefined {
    if (!value || value.length === 0) return undefined

    switch (format) {
      case 'semver':
        return validateSemver(value)
      case 'calver':
        return validateCalver(value)
      case 'custom':
        return undefined
      default:
        return undefined
    }
  }

  private async getGitAuthor(): Promise<string> {
    const nameResult = await this.processService.exec('git config --get user.name')
    if (nameResult.error) {
      throw nameResult.error
    }

    const emailResult = await this.processService.exec('git config --get user.email')
    if (emailResult.error) {
      throw emailResult.error
    }

    return `${nameResult.stdout} <${emailResult.stdout}>`
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

  private async getCurrentConfig(): Promise<ProjectConfig> {
    const packageJsonPath = join(process.cwd(), 'package.json')

    if (!this.fileHandler.exists(packageJsonPath)) {
      return await this.getDefaultConfig()
    }

    try {
      const packageJson = await this.fileHandler.readJson<Record<string, unknown>>(packageJsonPath)
      const gitAuthor = await this.getGitAuthor().catch(() => 'Unknown <unknown@example.com>')

      return {
        name: (packageJson.name as string) || 'my-project',
        description: (packageJson.description as string) || 'A JavaScript/TypeScript project',
        version: (packageJson.version as string) || '0.1.0',
        author: gitAuthor
      }
    } catch {
      return await this.getDefaultConfig()
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

  private async initializeDockerConfig(projectName: string): Promise<DockerConfig | null> {
    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')

    if (!this.fileHandler.exists(dockerComposePath)) {
      return null
    }

    const serviceName = await this.promptService.text({
      message: 'Enter Docker service name:',
      placeholder: projectName,
      defaultValue: projectName
    })

    const imageVersion = await this.promptService.text({
      message: 'Enter Docker image version:',
      placeholder: 'latest',
      defaultValue: 'latest'
    })

    const packageManager = await this.promptService.select({
      message: 'Select package manager:',
      options: [
        { value: 'pnpm', label: 'pnpm' },
        { value: 'npm', label: 'npm' },
        { value: 'yarn', label: 'yarn' }
      ]
    })

    const registryUrl = 'https://registry.npmjs.org/'

    return {
      serviceName,
      projectName,
      imageVersion,
      packageManager,
      registryUrl
    }
  }

  private async updatePackageJson(config: ProjectConfig): Promise<void> {
    const packageJsonPath = join(process.cwd(), 'package.json')

    if (!this.fileHandler.exists(packageJsonPath)) {
      this.consoleService.warn('package.json not found, skipping update.')
      return
    }

    try {
      const packageJson = await this.fileHandler.readJson<Record<string, unknown>>(packageJsonPath)
      packageJson.name = config.name || packageJson.name
      packageJson.description = config.description || packageJson.description
      packageJson.version = config.version || packageJson.version
      packageJson.author = config.author || packageJson.author
      await this.fileHandler.writeJson(packageJsonPath, packageJson)
    } catch (error) {
      this.consoleService.error('Failed to update package.json:', error)
    }
  }

  private async updateDockerCompose(config: DockerConfig): Promise<void> {
    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')

    try {
      const fileContents = await this.fileHandler.readFile(dockerComposePath)
      const doc = parseDocument(fileContents)

      if (!isMap(doc.contents)) {
        this.consoleService.warn('Invalid docker-compose.yml structure')
        return
      }

      const hasScalarKey = (pair: unknown, key: string): pair is Pair<Scalar<string>, YAMLMap> =>
        isPair(pair) && isScalar(pair.key) && pair.key.value === key

      const servicesPair = doc.contents.items.find((pair) => hasScalarKey(pair, 'services'))
      if (!servicesPair || !isMap(servicesPair.value)) {
        this.consoleService.warn('services not found in docker-compose.yml')
        return
      }

      const mainServicePair = servicesPair.value.items.find((pair) =>
        hasScalarKey(pair, this.mainServiceName)
      )
      if (!mainServicePair || !isMap(mainServicePair.value)) {
        this.consoleService.warn(`${this.mainServiceName} service not found in docker-compose.yml`)
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

      await this.fileHandler.writeFile(dockerComposePath, yamlContent)
    } catch (error) {
      this.consoleService.error('Failed to update docker-compose.yml:', error)
    }
  }

  private async initializeWithDefaults(): Promise<void> {
    const s = this.promptService.spinnerMessage({
      message: 'Initializing project with defaults...'
    })
    s.start()

    const config = await this.getDefaultConfig()
    await this.updatePackageJson(config)

    const dockerComposePath = join(process.cwd(), 'docker-compose.yml')
    if (this.fileHandler.exists(dockerComposePath)) {
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
    this.consoleService.log('  ✓ package.json updated')
    if (this.fileHandler.exists(dockerComposePath)) {
      this.consoleService.log('  ✓ docker-compose.yml updated')
    }
    this.consoleService.success('Project initialized successfully.')
  }

  private async initializeInteractive(): Promise<void> {
    const currentConfig = await this.getCurrentConfig()

    const name = await this.promptService.text({
      message: 'Enter project name:',
      placeholder: currentConfig.name,
      defaultValue: currentConfig.name,
      validate: (value) => {
        if (!value || value.length === 0) return 'Name is required!'
        return validateKebabCase(value)
      }
    })

    const description = await this.promptService.text({
      message: 'Enter project description:',
      placeholder: currentConfig.description,
      defaultValue: currentConfig.description
    })

    const versionFormat = await this.promptService.select({
      message: 'Select version format:',
      options: [
        { value: 'semver', label: 'Semantic (0.1.0)' },
        { value: 'calver', label: `Calendar (${getCalver()})` },
        { value: 'custom', label: 'Custom (any format)' }
      ]
    })

    const version = await this.promptService.text({
      message: 'Enter project version:',
      placeholder: this.getVersionPlaceholder(versionFormat),
      defaultValue: this.getVersionDefault(versionFormat),
      validate: (value) => this.validateVersion(value, versionFormat)
    })

    const author = await this.promptService.text({
      message: 'Enter project author:',
      placeholder: currentConfig.author,
      defaultValue: currentConfig.author
    })

    const config: ProjectConfig = {
      name,
      description,
      version,
      author
    }

    const dockerConfig = await this.initializeDockerConfig(name)

    const changes = this.getConfigChanges(currentConfig, config, dockerConfig)

    if (changes.length > 0) {
      this.consoleService.info('\nChanges to be applied:')
      for (const change of changes) {
        this.consoleService.log(`  ${change}`)
      }
    } else {
      this.consoleService.info('\nNo changes to apply.')
    }

    const shouldWrite = await this.promptService.confirm({
      message: 'Write changes?'
    })

    if (!shouldWrite) {
      this.consoleService.info('Operation cancelled.')
      process.exit(0)
    }

    try {
      await this.updatePackageJson(config)
      if (dockerConfig) {
        await this.updateDockerCompose(dockerConfig)
      }
      this.consoleService.info('\nChanges applied:')
      this.consoleService.log('  ✓ package.json updated')
      if (dockerConfig) {
        this.consoleService.log('  ✓ docker-compose.yml updated')
      }
      this.consoleService.success('Project initialized successfully.')
    } catch (error) {
      this.consoleService.error('Failed to update project:', error)
    }
  }

  @Option({
    flags: '-d, --defaults',
    description: 'Use default values instead of prompting'
  })
  parseDefaults(): boolean {
    return true
  }

  async run(_passedParam: string[], options?: InitProjectOptions): Promise<void> {
    if (options?.defaults) {
      await this.initializeWithDefaults()
    } else {
      await this.initializeInteractive()
    }
  }
}
