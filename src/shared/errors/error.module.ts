import { Global, Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { ErrorService } from './error.service'
import { AllExceptionsFilter } from './exception.filter'

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    },
    ErrorService
  ],
  exports: [ErrorService]
})
export class ErrorModule {}
