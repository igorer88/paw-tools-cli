import { Module } from '@nestjs/common';

import { GreetCommand } from './commands';

@Module({
  providers: [GreetCommand],
})
export class CliModule {}
