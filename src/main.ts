import { NestFactory } from '@nestjs/core'
import { CommandFactory } from 'nest-commander'

import { AppModule } from './app.module'
import { checkDependencies } from './setup'
import { ExitCodes } from './shared/exit-codes'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule)

  const hasMissingDeps = await checkDependencies(app)
  if (hasMissingDeps) {
    process.exit(ExitCodes.ERROR)
  }

  await CommandFactory.run(AppModule)
}

bootstrap()
