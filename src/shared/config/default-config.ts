export const DEFAULT_CONFIG = {
  app: {
    environment: 'development',
    secretKey: '',
    logger: {
      level: 'debug',
      tag: false,
      date: false,
      format: 'pretty'
    }
  }
}

export type AppConfig = typeof DEFAULT_CONFIG
