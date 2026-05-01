import * as enums from './enums'
import * as environment from './environment'
import * as config from './index'
import * as logger from './logger'

describe('Config barrel file', () => {
  it('should re-export all enums', () => {
    expect(config).toEqual(expect.objectContaining(enums))
  })

  it('should re-export all environment modules', () => {
    expect(config).toEqual(expect.objectContaining(environment))
  })

  it('should re-export all logger modules', () => {
    expect(config).toEqual(expect.objectContaining(logger))
  })
})
