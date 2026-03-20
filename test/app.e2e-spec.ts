import { Test, TestingModule } from '@nestjs/testing'

import { AppModule } from '../src/app.module'

describe('App (e2e)', () => {
  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()
  })

  afterEach(async () => {
    await module.close()
  })

  it('should compile the app module', async () => {
    expect(module).toBeDefined()
  })
})
