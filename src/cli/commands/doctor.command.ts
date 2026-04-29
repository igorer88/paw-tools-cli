import { Command, CommandRunner, Option } from 'nest-commander'

import {
  OPTIONAL_DEPENDENCIES,
  REQUIRED_DEPENDENCIES
} from '@/config/constants/dependencies.constants'
import { ConsoleService } from '@/shared/console'
import { DependencyService } from '@/shared/dependency'
import { ExitCodes } from '@/shared/exit-codes'
import { ProcessService } from '@/shared/process'

interface DoctorOptions {
  verbose?: boolean
}

@Command({
  name: 'doctor',
  description: 'Check dependency health'
})
export class DoctorCommand extends CommandRunner {
  private readonly consoleService: ConsoleService
  private readonly dependencyService: DependencyService

  constructor() {
    super()
    this.consoleService = new ConsoleService()
    this.dependencyService = new DependencyService(new ProcessService())
  }

  private getStatusIcon(isInstalled: boolean, hasWarning: boolean): string {
    if (!isInstalled) return '✗'
    if (hasWarning) return '⚠'
    return '✓'
  }

  private formatDependency(
    dep: { name: string; version?: string; description?: string },
    installedVersion: string | null,
    requiredVersion: string | null,
    isInstalled: boolean,
    hasWarning: boolean,
    verbose: boolean
  ): void {
    const icon = this.getStatusIcon(isInstalled, hasWarning)
    const versionInfo = requiredVersion ? ` (${requiredVersion})` : ''
    const installedInfo = installedVersion ? ` ${installedVersion}` : ''

    this.consoleService.info(`  ${icon} ${dep.name}${installedInfo}${versionInfo}`)

    if (verbose) {
      if (dep.description) {
        this.consoleService.log(`    Description: ${dep.description}`)
      }
      if (!isInstalled) {
        this.consoleService.warn(`    Status: not installed`)
      }
    }
  }

  @Option({
    flags: '-v, --verbose',
    description: 'Show detailed information'
  })
  parseVerbose(): boolean {
    return true
  }

  async run(_params: string[], options?: DoctorOptions): Promise<void> {
    this.consoleService.info('Checking dependencies...\n')

    const requiredResult = await this.dependencyService.check(REQUIRED_DEPENDENCIES)
    const optionalResult = await this.dependencyService.check(OPTIONAL_DEPENDENCIES)

    // Required Dependencies
    this.consoleService.info('Required Dependencies:')
    for (const dep of REQUIRED_DEPENDENCIES) {
      const missing = requiredResult.missing.find((m) => m.name === dep.name)
      const warning = requiredResult.warnings.find((w) => w.name === dep.name)

      if (missing) {
        this.formatDependency(
          dep,
          null,
          missing.requiredVersion,
          false,
          false,
          options?.verbose ?? false
        )
      } else if (warning) {
        this.formatDependency(
          dep,
          warning.installedVersion,
          warning.requiredVersion,
          true,
          true,
          options?.verbose ?? false
        )
        if (options?.verbose) {
          this.consoleService.warn(`    Path: ${warning.installedPath}`)
          this.consoleService.warn(`    Status: Some features may be limited`)
        }
      } else {
        this.formatDependency(
          dep,
          null,
          dep.version || null,
          true,
          false,
          options?.verbose ?? false
        )
        const installedPath = this.dependencyService.which(dep.name)
        if (options?.verbose && installedPath) {
          this.consoleService.log(`    Path: ${installedPath}`)
        }
      }
    }

    // Optional Dependencies
    this.consoleService.info('\nOptional Dependencies:')
    let hasOptionalShown = false

    for (const dep of OPTIONAL_DEPENDENCIES) {
      const missing = optionalResult.missing.find((m) => m.name === dep.name)
      const warning = optionalResult.warnings.find((w) => w.name === dep.name)

      if (missing) {
        if (options?.verbose) {
          this.formatDependency(dep, null, missing.requiredVersion, false, false, true)
          hasOptionalShown = true
        }
      } else if (warning) {
        this.formatDependency(
          dep,
          warning.installedVersion,
          warning.requiredVersion,
          true,
          true,
          options?.verbose ?? false
        )
        if (options?.verbose) {
          this.consoleService.warn(`    Path: ${warning.installedPath}`)
          this.consoleService.warn(`    Status: Some features may be limited`)
        }
        hasOptionalShown = true
      } else {
        const installedPath = this.dependencyService.which(dep.name)
        if (installedPath) {
          this.formatDependency(
            dep,
            null,
            dep.version || null,
            true,
            false,
            options?.verbose ?? false
          )
          if (options?.verbose) {
            this.consoleService.log(`    Path: ${installedPath}`)
          }
          hasOptionalShown = true
        } else if (options?.verbose) {
          // Show as not installed in verbose mode
          this.formatDependency(dep, null, dep.version || null, false, false, true)
          hasOptionalShown = true
        }
      }
    }

    if (!hasOptionalShown && OPTIONAL_DEPENDENCIES.length > 0) {
      this.consoleService.info('  (none installed)')
    }

    // Summary
    const totalWarnings = requiredResult.warnings.length + optionalResult.warnings.length
    const hasRequiredMissing = requiredResult.missing.length > 0

    this.consoleService.info('')
    if (hasRequiredMissing) {
      this.consoleService.fail('Dependency Health: FAILED')
      process.exit(ExitCodes.ERROR)
    }

    if (totalWarnings > 0) {
      this.consoleService.warn(
        `Dependency Health: OK (${totalWarnings} warning${totalWarnings > 1 ? 's' : ''})`
      )
    } else {
      this.consoleService.success('Dependency Health: OK')
    }
  }
}
