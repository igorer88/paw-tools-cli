import { Global, Module } from '@nestjs/common'

import { FileHandlerService } from './file-handler.service'

@Global()
@Module({
  providers: [FileHandlerService],
  exports: [FileHandlerService]
})
export class FileHandlerModule {}
