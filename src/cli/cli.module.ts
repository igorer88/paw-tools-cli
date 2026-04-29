import { Module } from '@nestjs/common'

import { ConfigCommand, DoctorCommand, GenerateSecretCommand, InitProjectCommand } from './commands'

@Module({
  providers: [ConfigCommand, DoctorCommand, GenerateSecretCommand, InitProjectCommand]
})
export class CliModule {}
