import { isEmptyObject } from './utils.helper'

describe('UtilsHelper', () => {
  it('Should check isEmptyObject', () => {
    expect(isEmptyObject).toBeDefined()
    expect(isEmptyObject({})).toBeTruthy()
    expect(isEmptyObject({ key: 'value' })).toBeFalsy()
  })
})
