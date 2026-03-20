export interface FormattedError {
  message: string
  exception: unknown
  errorCode: string
  details?: string
  context?: Record<string, unknown>
  stack?: string
}
