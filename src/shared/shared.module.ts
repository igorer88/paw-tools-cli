import { Global, Module } from '@nestjs/common'
import { ErrorModule } from './errors/error.module'
import { FileHandlerModule } from './file-handler'
import { ProcessModule } from './process'

@Global()
@Module({
  imports: [ErrorModule, FileHandlerModule, ProcessModule]
})
export class SharedModule {}
