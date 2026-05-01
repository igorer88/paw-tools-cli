import { CommandFactory } from 'nest-commander'
import { AppModule } from './app.module'
import { REQUIRED_DEPENDENCIES } from './config/constants/dependencies.constants'
import { ConsoleService } from './shared/console'
import { DependencyService } from './shared/dependency'
import { ExitCodes } from './shared/exit-codes'

function shouldSkipCheck(): boolean {
  const args = process.argv.slice(2)
  return (
    args.includes('--help') ||
    args.includes('--version') ||
    args.includes('-h') ||
    args.includes('-v')
  )
}

export async function bootstrap(): Promise<void> {
  const app = await CommandFactory.createWithoutRunning(AppModule)

  if (!shouldSkipCheck()) {
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
      process.exit(ExitCodes.ERROR)
      return
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
  }

  await CommandFactory.runApplication(app)
}

bootstrap()
