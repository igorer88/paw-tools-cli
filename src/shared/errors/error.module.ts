import { Global, Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { DBErrorsService } from './database-errors.service'
import { ErrorService } from './error.service'
import { AllExceptionsFilter } from './exception.filter'

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter
    },
    ErrorService,
    DBErrorsService
  ],
  exports: [ErrorService, DBErrorsService]
})
export class ErrorModule {}
