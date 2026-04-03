export const text = jest.fn()
export const confirm = jest.fn()
export const select = jest.fn()
export const spinner = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn()
}))
export const cancel = jest.fn()
export const isCancel = jest.fn(() => false)
