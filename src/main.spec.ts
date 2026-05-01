import { NestFactory } from '@nestjs/core'
import { CommandFactory } from 'nest-commander'

import { AppModule } from './app.module'
import { ExitCodes } from './shared/exit-codes'

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn()
  }
}))

jest.mock('nest-commander', () => ({
  CommandFactory: {
    run: jest.fn()
  }
}))

jest.mock('./app.module', () => ({
  AppModule: class AppModule {}
}))

jest.mock('./setup', () => ({
  checkDependencies: jest.fn()
}))

const mockNestFactory = NestFactory as jest.Mocked<typeof NestFactory>
const mockCommandFactory = CommandFactory as jest.Mocked<typeof CommandFactory>

describe('bootstrap', () => {
  let exitSpy: jest.SpyInstance
  let mockCheckDeps: jest.Mock

  beforeAll(async () => {
    const setup = await import('./setup')
    mockCheckDeps = setup.checkDependencies as jest.Mock
  })

  beforeEach(() => {
    jest.clearAllMocks()
    const mockApp = {
      close: jest.fn().mockResolvedValue(undefined)
    }
    mockNestFactory.createApplicationContext.mockResolvedValue(mockApp as never)
    mockCommandFactory.run.mockResolvedValue(undefined)
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('should create app context and run command factory when deps are ok', async () => {
    mockCheckDeps.mockResolvedValue(false)

    const { bootstrap } = require('./main')
    await bootstrap()

    expect(mockNestFactory.createApplicationContext).toHaveBeenCalledWith(AppModule)
    expect(mockCheckDeps).toHaveBeenCalled()
    expect(mockCommandFactory.run).toHaveBeenCalledWith(AppModule)
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('should exit with error code when dependencies are missing', async () => {
    mockCheckDeps.mockResolvedValue(true)

    const { bootstrap } = require('./main')
    await bootstrap()

    expect(mockNestFactory.createApplicationContext).toHaveBeenCalled()
    expect(mockCheckDeps).toHaveBeenCalled()
    expect(process.exit).toHaveBeenCalledWith(ExitCodes.ERROR)
  })
})
