import { Logger } from '@nestjs/common'

import { ErrorTypes } from './enums'

export abstract class BaseError extends Error {
  public context: Record<string, unknown>

  constructor(
    public readonly message: string,
    public readonly type: ErrorTypes,
    public readonly errorCode: string,
    public readonly exception: unknown,
    public readonly stack: string,
    public readonly details?: string,
    public readonly extra?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.context = {}
    Error.captureStackTrace(this, this.constructor)
  }

  abstract logError(extraParam?: unknown): void
}

export class ClientException extends BaseError {
  private logger = new Logger(this.constructor.name)
  public readonly statusCode: number

  constructor(
    message: string,
    details: string | undefined,
    statusCode: number,
    errorCode: string,
    context: Record<string, unknown>,
    exception: unknown,
    stack?: string
  ) {
    super(message, ErrorTypes.CLIENT_ERROR, errorCode, exception, stack, details)
    this.context = context
    this.statusCode = statusCode
  }

  logError(extraParam?: unknown): void {
    this.logger.error(`${this.message} - ${this.details} - ${extraParam}`)
  }
}

export class InternalException extends BaseError {
  private logger = new Logger(this.constructor.name)

  constructor(
    message: string,
    details: string | undefined,
    context: Record<string, unknown>,
    exception: unknown,
    stack?: string
  ) {
    super(message, ErrorTypes.INTERNAL_ERROR, 'INTERNAL_ERROR', exception, stack, details)
    this.context = context
  }

  logError(extraParam?: unknown): void {
    this.logger.error(`${this.message} - ${this.details} - ${extraParam}`)
  }
}
