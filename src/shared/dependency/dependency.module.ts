import { Module } from '@nestjs/common'

import { ProcessModule } from '@/shared/process'
import { DependencyService } from './dependency.service'

@Module({
  imports: [ProcessModule],
  providers: [DependencyService],
  exports: [DependencyService]
})
export class DependencyModule {}
