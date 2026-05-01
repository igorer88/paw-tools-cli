export const mockConsola = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  start: jest.fn(),
  fail: jest.fn(),
  log: jest.fn()
}

const mockInstance = {
  ...mockConsola,
  withTag: jest.fn().mockReturnValue(mockConsola)
}

export const createConsola = jest.fn().mockReturnValue(mockInstance)
