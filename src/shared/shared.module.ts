import { Global, Module } from '@nestjs/common'

import { ConsoleModule } from './console'
import { DependencyModule } from './dependency'
import { FileHandlerModule } from './file-handler'
import { ProcessModule } from './process'
import { PromptModule } from './prompt'

@Global()
@Module({
  imports: [ConsoleModule, DependencyModule, FileHandlerModule, ProcessModule, PromptModule]
})
export class SharedModule {}
