import { Global, Module } from '@nestjs/common'

import { ProcessService } from './process.service'

@Global()
@Module({
  providers: [ProcessService],
  exports: [ProcessService]
})
export class ProcessModule {}
