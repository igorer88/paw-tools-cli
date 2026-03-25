import {
  getCalver,
  isEmptyObject,
  validateCalver,
  validateKebabCase,
  validateSemver
} from './utils.helper'

describe('UtilsHelper', () => {
  describe('isEmptyObject', () => {
    it('should check isEmptyObject', () => {
      expect(isEmptyObject).toBeDefined()
      expect(isEmptyObject({})).toBeTruthy()
      expect(isEmptyObject({ key: 'value' })).toBeFalsy()
    })
  })

  describe('validateKebabCase', () => {
    it('should return undefined for valid kebab-case', () => {
      expect(validateKebabCase('my-project')).toBeUndefined()
      expect(validateKebabCase('a')).toBeUndefined()
      expect(validateKebabCase('a1')).toBeUndefined()
      expect(validateKebabCase('a1-b2-c3')).toBeUndefined()
    })

    it('should return error message for invalid kebab-case', () => {
      expect(validateKebabCase('MyProject')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateKebabCase('my_project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateKebabCase('my.project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateKebabCase('my project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should return undefined for empty value', () => {
      expect(validateKebabCase('')).toBeUndefined()
      expect(validateKebabCase(undefined as unknown as string)).toBeUndefined()
    })
  })

  describe('validateSemver', () => {
    it('should return undefined for valid semver', () => {
      expect(validateSemver('1.0.0')).toBeUndefined()
      expect(validateSemver('0.1.0')).toBeUndefined()
      expect(validateSemver('10.20.30')).toBeUndefined()
    })

    it('should return error message for invalid semver', () => {
      expect(validateSemver('abc')).toBe('Must be semver format (x.y.z)')
      expect(validateSemver('1.0')).toBe('Must be semver format (x.y.z)')
      expect(validateSemver('v1.0.0')).toBe('Must be semver format (x.y.z)')
    })

    it('should return undefined for empty value', () => {
      expect(validateSemver('')).toBeUndefined()
      expect(validateSemver(undefined as unknown as string)).toBeUndefined()
    })
  })

  describe('validateCalver', () => {
    it('should return undefined for valid calver', () => {
      expect(validateCalver('2024.03.1')).toBeUndefined()
      expect(validateCalver('2024.3.0')).toBeUndefined()
      expect(validateCalver('2024.12.31')).toBeUndefined()
    })

    it('should return error message for invalid calver', () => {
      expect(validateCalver('abc')).toBe('Must be calver format (YYYY.M.PATCH)')
      expect(validateCalver('1.0.0')).toBe('Must be calver format (YYYY.M.PATCH)')
      expect(validateCalver('24.03.1')).toBe('Must be calver format (YYYY.M.PATCH)')
    })

    it('should return undefined for empty value', () => {
      expect(validateCalver('')).toBeUndefined()
      expect(validateCalver(undefined as unknown as string)).toBeUndefined()
    })
  })

  describe('getCalver', () => {
    it('should return today in YYYY.MM.DD format', () => {
      const result = getCalver()
      expect(result).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
      const [year, month, day] = result.split('.').map(Number)
      const today = new Date()
      expect(year).toBe(today.getFullYear())
      expect(month).toBe(today.getMonth() + 1)
      expect(day).toBe(today.getDate())
    })

    it('should return given date in YYYY.MM.DD format', () => {
      const date = new Date(2024, 2, 15)
      const result = getCalver(date)
      expect(result).toBe('2024.03.15')
    })

    it('should pad single digit month and day', () => {
      const date = new Date(2024, 0, 5)
      const result = getCalver(date)
      expect(result).toBe('2024.01.05')
    })
  })
})
