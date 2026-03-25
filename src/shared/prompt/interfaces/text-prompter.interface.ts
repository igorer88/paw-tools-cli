export interface TextOptions {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | undefined
}
