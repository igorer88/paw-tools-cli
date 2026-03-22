import { randomBytes } from 'node:crypto'

import { Command, CommandRunner } from 'nest-commander'

@Command({
  name: 'generate-secret',
  description: 'Generate a random secret key'
})
export class GenerateSecretCommand extends CommandRunner {
  async run(): Promise<void> {
    const secretKey = randomBytes(32).toString('hex')
    console.log(secretKey)
  }
}
