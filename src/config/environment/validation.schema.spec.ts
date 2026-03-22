import { Environment } from '../enums'
import { getValidationSchema } from './validation.schema'

describe('ValidationSchema', () => {
  let schema: ReturnType<typeof getValidationSchema>

  beforeEach(() => {
    schema = getValidationSchema()
  })

  it('should return a Joi validation schema', () => {
    expect(schema).toBeDefined()
    expect(typeof schema.validate).toBe('function')
  })

  it('should accept valid NODE_ENV values', () => {
    const validEnvs = [Environment.Development, Environment.Production, Environment.Test]

    for (const env of validEnvs) {
      const { error } = schema.validate({ NODE_ENV: env, APP_SECRET_KEY: 'a'.repeat(32) })
      expect(error).toBeUndefined()
    }
  })

  it('should reject invalid NODE_ENV values', () => {
    const { error } = schema.validate({ NODE_ENV: 'staging', APP_SECRET_KEY: 'a'.repeat(32) })

    expect(error).toBeDefined()
    expect(error?.details[0].path).toContain('NODE_ENV')
  })

  it('should default NODE_ENV to development', () => {
    const { value } = schema.validate({})

    expect(value.NODE_ENV).toBe(Environment.Development)
  })

  it('should accept valid DEBUG boolean values', () => {
    const { value: trueValue } = schema.validate({ DEBUG: true })
    const { value: falseValue } = schema.validate({ DEBUG: false })

    expect(trueValue.DEBUG).toBe(true)
    expect(falseValue.DEBUG).toBe(false)
  })

  it('should default DEBUG to false', () => {
    const { value } = schema.validate({})

    expect(value.DEBUG).toBe(false)
  })

  it('should accept APP_SECRET_KEY with minimum 32 characters', () => {
    const { error } = schema.validate({ APP_SECRET_KEY: 'a'.repeat(32) })

    expect(error).toBeUndefined()
  })

  it('should reject APP_SECRET_KEY with less than 32 characters', () => {
    const { error } = schema.validate({ APP_SECRET_KEY: 'short' })

    expect(error).toBeDefined()
    expect(error?.details[0].path).toContain('APP_SECRET_KEY')
  })

  it('should default APP_LOGGER_LEVELS to all levels', () => {
    const { value } = schema.validate({})

    expect(value.APP_LOGGER_LEVELS).toBe('log,error,warn,debug,verbose,fatal')
  })

  it('should accept custom APP_LOGGER_LEVELS', () => {
    const { value } = schema.validate({ APP_LOGGER_LEVELS: 'log,error' })

    expect(value.APP_LOGGER_LEVELS).toBe('log,error')
  })

  it('should allow unknown environment variables', () => {
    const { error } = schema.validate({
      UNKNOWN_VAR: 'value',
      APP_SECRET_KEY: 'a'.repeat(32)
    })

    expect(error).toBeUndefined()
  })
})
