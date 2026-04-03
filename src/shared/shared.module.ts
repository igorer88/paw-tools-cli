import { Global, Module } from '@nestjs/common'

import { ConsoleModule } from './console'
import { FileHandlerModule } from './file-handler'
import { ProcessModule } from './process'
import { PromptModule } from './prompt'

@Global()
@Module({
  imports: [ConsoleModule, FileHandlerModule, ProcessModule, PromptModule]
})
export class SharedModule {}
