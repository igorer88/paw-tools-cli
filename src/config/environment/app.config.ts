import { registerAs } from '@nestjs/config'

import { loadConfig } from '@/shared/config/config-loader'

export const appConfig = registerAs('app', () => {
  const config = loadConfig()
  return config.app
})
