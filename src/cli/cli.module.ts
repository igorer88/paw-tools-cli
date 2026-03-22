import { Module } from '@nestjs/common'

import { ConfigCommand, GenerateSecretCommand, InitCommand } from './commands'

@Module({
  providers: [ConfigCommand, GenerateSecretCommand, InitCommand]
})
export class CliModule {}
