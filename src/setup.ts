import type { INestApplicationContext } from '@nestjs/common'
import { REQUIRED_DEPENDENCIES } from './config/constants/dependencies.constants'
import { ConsoleService } from './shared/console'
import { DependencyService } from './shared/dependency'

/**
 * Checks if all required dependencies are installed
 * @param app The NestJS application context
 * @returns A promise resolving to true if any dependencies are missing, false otherwise
 */
export async function checkDependencies(app: INestApplicationContext): Promise<boolean> {
  const args = process.argv.slice(2)

  // Skip dependency check for --help, --version
  if (
    args.includes('--help') ||
    args.includes('--version') ||
    args.includes('-h') ||
    args.includes('-v')
  ) {
    return false
  }

  const dependencyService = app.get(DependencyService)
  const consoleService = app.get(ConsoleService)

  consoleService.debug('Checking required dependencies...')

  const { missing, warnings } = await dependencyService.check(REQUIRED_DEPENDENCIES)

  if (missing.length > 0) {
    consoleService.error('Missing dependencies:')
    for (const dep of missing) {
      const version = dep.requiredVersion ? ` (required: ${dep.requiredVersion})` : ''
      consoleService.error(`  - ${dep.name}${version}`)
    }
    await app.close()
    return true
  }

  if (warnings.length > 0) {
    consoleService.warn('Dependency warnings:')
    for (const warning of warnings) {
      consoleService.warn(
        `  - ${warning.name}: ${warning.installedVersion} found, ${warning.requiredVersion} recommended`
      )
    }
  }

  consoleService.debug('All required dependencies are installed')
  await app.close()
  return false
}
