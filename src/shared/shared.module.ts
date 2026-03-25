import { Global, Module } from '@nestjs/common'
import { ErrorModule } from './errors/error.module'
import { FileHandlerModule } from './file-handler'
import { ProcessModule } from './process'
import { PromptModule } from './prompt'

@Global()
@Module({
  imports: [ErrorModule, FileHandlerModule, ProcessModule, PromptModule]
})
export class SharedModule {}
