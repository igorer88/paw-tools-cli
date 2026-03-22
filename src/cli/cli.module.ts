import { Module } from '@nestjs/common'

import { ConfigCommand } from './commands'

@Module({
  providers: [ConfigCommand]
})
export class CliModule {}
