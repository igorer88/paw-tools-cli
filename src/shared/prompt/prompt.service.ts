import { cancel, confirm, isCancel, select, spinner, text } from '@clack/prompts'

import type { ConfirmOptions, SelectOptions, SpinnerOptions, TextOptions } from './interfaces'

export class PromptService {
  async text(options: TextOptions): Promise<string> {
    const result = await text({
      message: options.message,
      placeholder: options.placeholder,
      defaultValue: options.defaultValue,
      validate: options.validate
    })

    if (isCancel(result)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    return result as string
  }

  async select(options: SelectOptions): Promise<string> {
    const result = await select({
      message: options.message,
      options: options.options
    })

    if (isCancel(result)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    return result as string
  }

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const result = await confirm({
      message: options.message
    })

    if (isCancel(result)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }

    return result as boolean
  }

  async spinner<T>(options: SpinnerOptions, fn: () => Promise<T>): Promise<T> {
    const s = spinner()
    s.start(options.message)

    try {
      const result = await fn()
      s.stop('Done')
      return result
    } catch (error) {
      s.stop('Failed')
      throw error
    }
  }

  spinnerMessage(options: SpinnerOptions): { start: () => void; stop: (message?: string) => void } {
    const s = spinner()
    return {
      start: () => s.start(options.message),
      stop: (message?: string) => s.stop(message)
    }
  }
}
