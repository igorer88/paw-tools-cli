import { Module } from '@nestjs/common'

import { ConfigCommand, GenerateSecretCommand, InitProjectCommand } from './commands'

@Module({
  providers: [ConfigCommand, GenerateSecretCommand, InitProjectCommand]
})
export class CliModule {}
