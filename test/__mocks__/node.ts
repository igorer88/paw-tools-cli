// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(global as any).__nodeMocks) {
  ;(global as any).__nodeMocks = {
    execCallback: jest.fn(),
    execSync: jest.fn(),
    spawn: jest.fn(),
    platform: jest.fn()
  }
}

jest.mock('node:child_process', () => {
  const { promisify } = require('node:util')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mocks = (global as any).__nodeMocks

  const customSymbol = (promisify as any).custom
  const execMock = jest.fn()
  ;(execMock as any)[customSymbol] = (command: string, options?: unknown) =>
    new Promise((resolve, reject) => {
      mocks.execCallback((error: unknown, stdout?: unknown, stderr?: unknown) => {
        if (error) reject(error)
        else resolve({ stdout, stderr })
      })
    })

  return {
    __esModule: true,
    exec: execMock,
    execSync: mocks.execSync,
    spawn: mocks.spawn
  }
})

jest.mock('node:os', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mocks = (global as any).__nodeMocks
  return {
    __esModule: true,
    platform: mocks.platform
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalMocks = (global as any).__nodeMocks

export const mockExecCallback = globalMocks.execCallback as jest.Mock
export const mockExecSync = globalMocks.execSync as jest.Mock
export const mockSpawn = globalMocks.spawn as jest.Mock
export const mockPlatform = globalMocks.platform as jest.Mock
