import { Global, Module } from '@nestjs/common';

import { ErrorModule } from './errors/error.module';

@Global()
@Module({
  imports: [ErrorModule],
})
export class SharedModule {}
