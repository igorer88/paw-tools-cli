import { randomBytes } from 'node:crypto'

import { Command, CommandRunner } from 'nest-commander'

import { ConsoleService } from '@/shared/console'

@Command({
  name: 'generate-secret',
  description: 'Generate a random secret key'
})
export class GenerateSecretCommand extends CommandRunner {
  private readonly consoleService: ConsoleService

  constructor() {
    super()
    this.consoleService = new ConsoleService()
  }

  async run(): Promise<void> {
    const secretKey = randomBytes(32).toString('hex')
    this.consoleService.success(secretKey)
  }
}
