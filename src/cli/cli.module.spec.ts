import { Test } from '@nestjs/testing'
import { CommandFactory } from 'nest-commander'
import { CliModule } from './cli.module'

// Mock all command dependencies
jest.mock('./commands', () => ({
  ConfigCommand: class MockConfigCommand {},
  DoctorCommand: class MockDoctorCommand {},
  GenerateSecretCommand: class MockGenerateSecretCommand {},
  InitProjectCommand: class MockInitProjectCommand {}
}))

jest.mock('nest-commander', () => require('@mocks/nest-commander'))

describe('CliModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [CliModule]
    }).compile()

    expect(module).toBeDefined()
  })
})
