import * as configLoader from './config-loader'
import * as defaultConfig from './default-config'
import * as config from './index'

describe('Shared Config barrel file', () => {
  it('should re-export config-loader', () => {
    expect(config).toEqual(expect.objectContaining(configLoader))
  })

  it('should re-export default-config', () => {
    expect(config).toEqual(expect.objectContaining(defaultConfig))
  })
})
