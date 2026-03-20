import { ExceptionFilter, Catch, Logger } from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  async catch(exception: unknown): Promise<void> {
    const error = exception as Error
    this.logger.error(`Error: ${error.message}`, error.stack)
  }
}
