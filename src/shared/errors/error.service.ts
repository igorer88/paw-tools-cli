import { Injectable } from '@nestjs/common'

import { ClientException, InternalException } from './base.error'
import type { FormattedError } from './error.interface'

@Injectable()
export class ErrorService {
  private formatInternalException(error: InternalException): FormattedError {
    return {
      message: error.message,
      details: error.details,
      errorCode: error.errorCode,
      exception: error.exception,
      stack: error.stack,
      context: error.context
    }
  }

  public handleException(exception: unknown): ClientException {
    if (exception instanceof ClientException) {
      return exception
    }

    if (exception instanceof InternalException) {
      const formattedError = this.formatInternalException(exception)
      return new ClientException(
        formattedError.message,
        formattedError.details,
        500,
        formattedError.errorCode,
        formattedError.context,
        formattedError.exception,
        formattedError.stack
      )
    }

    const error = exception as Error
    return new ClientException(
      error.message,
      undefined,
      1,
      'UNKNOWN_ERROR',
      {},
      exception,
      error.stack
    )
  }
}
