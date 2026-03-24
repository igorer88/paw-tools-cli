import { Global, Module } from '@nestjs/common'
import { ErrorModule } from './errors/error.module'
import { FileHandlerModule } from './file-handler'

@Global()
@Module({
  imports: [ErrorModule, FileHandlerModule]
})
export class SharedModule {}
