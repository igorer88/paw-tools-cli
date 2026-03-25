import { Global, Module } from '@nestjs/common'
import { ConsoleModule } from './console'
import { ErrorModule } from './errors/error.module'
import { FileHandlerModule } from './file-handler'
import { ProcessModule } from './process'
import { PromptModule } from './prompt'

@Global()
@Module({
  imports: [ConsoleModule, ErrorModule, FileHandlerModule, ProcessModule, PromptModule]
})
export class SharedModule {}
