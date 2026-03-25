import type { ConfirmOptions, SelectOptions, SpinnerOptions, TextOptions } from './interfaces'

export interface Prompter {
  text(options: TextOptions): Promise<string>
  select(options: SelectOptions): Promise<string>
  confirm(options: ConfirmOptions): Promise<boolean>
  spinner<T>(options: SpinnerOptions, fn: () => Promise<T>): Promise<T>
  spinnerMessage(options: SpinnerOptions): { start: () => void; stop: (message?: string) => void }
}

export * from './interfaces'
