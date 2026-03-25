import { validateCalver, validateKebabCase, validateSemver } from '@/shared/utils.helper'

describe('InitProjectCommand Validation Integration', () => {
  describe('validateKebabCase (used in name validation callback)', () => {
    it('should accept valid kebab-case names', () => {
      expect(validateKebabCase('my-project')).toBeUndefined()
      expect(validateKebabCase('api')).toBeUndefined()
      expect(validateKebabCase('my-awesome-app-123')).toBeUndefined()
      expect(validateKebabCase('a')).toBeUndefined()
    })

    it('should reject names with spaces', () => {
      expect(validateKebabCase('my project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateKebabCase('My Project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject names with underscores', () => {
      expect(validateKebabCase('my_project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject names with dots', () => {
      expect(validateKebabCase('my.project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject PascalCase names', () => {
      expect(validateKebabCase('MyProject')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateKebabCase('MyProjectApp')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject camelCase names', () => {
      expect(validateKebabCase('myProject')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should return undefined for empty names (handled separately in callback)', () => {
      expect(validateKebabCase('')).toBeUndefined()
    })

    it('should reject names starting with hyphen', () => {
      expect(validateKebabCase('-my-project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject names ending with hyphen', () => {
      expect(validateKebabCase('my-project-')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })

    it('should reject names with consecutive hyphens', () => {
      expect(validateKebabCase('my--project')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
    })
  })

  describe('validateSemver (used in version validation callback)', () => {
    it('should accept valid semver versions', () => {
      expect(validateSemver('1.0.0')).toBeUndefined()
      expect(validateSemver('0.1.0')).toBeUndefined()
      expect(validateSemver('10.20.30')).toBeUndefined()
      expect(validateSemver('0.0.1')).toBeUndefined()
      expect(validateSemver('1.0.0-alpha')).toBeUndefined()
      expect(validateSemver('1.0.0-beta.1')).toBeUndefined()
    })

    it('should reject invalid semver versions', () => {
      expect(validateSemver('abc')).toBe('Must be semver format (x.y.z)')
      expect(validateSemver('1.0')).toBe('Must be semver format (x.y.z)')
      expect(validateSemver('v1.0.0')).toBe('Must be semver format (x.y.z)')
      expect(validateSemver('1')).toBe('Must be semver format (x.y.z)')
    })

    it('should accept extended semver versions (regex matches partial)', () => {
      expect(validateSemver('1.0.0.0')).toBeUndefined()
    })
  })

  describe('validateCalver (used in version validation callback)', () => {
    it('should accept valid calver versions', () => {
      expect(validateCalver('2024.01.01')).toBeUndefined()
      expect(validateCalver('2024.1.1')).toBeUndefined()
      expect(validateCalver('2024.12.31')).toBeUndefined()
      expect(validateCalver('2026.03.25')).toBeUndefined()
    })

    it('should reject invalid calver versions', () => {
      expect(validateCalver('abc')).toBe('Must be calver format (YYYY.M.PATCH)')
      expect(validateCalver('1.0.0')).toBe('Must be calver format (YYYY.M.PATCH)')
      expect(validateCalver('2024.1')).toBe('Must be calver format (YYYY.M.PATCH)')
      expect(validateCalver('24.01.01')).toBe('Must be calver format (YYYY.M.PATCH)')
    })
  })

  describe('Inline validation callbacks in InitProjectCommand', () => {
    it('name validation callback uses validateKebabCase', () => {
      const validateNameCallback = (value: string) => {
        if (!value || value.length === 0) return 'Name is required!'
        return validateKebabCase(value)
      }

      expect(validateNameCallback('')).toBe('Name is required!')
      expect(validateNameCallback('Valid Name')).toBe(
        'Name must be kebab-case (lowercase, numbers, hyphens)'
      )
      expect(validateNameCallback('valid-name')).toBeUndefined()
    })

    it('version validation callback uses validateSemver and validateCalver', () => {
      const validateVersionCallback = (value: string, format: string) => {
        if (!value || value.length === 0) return undefined

        if (format === 'semver') return validateSemver(value)
        if (format === 'calver') return validateCalver(value)

        return undefined
      }

      expect(validateVersionCallback('', 'semver')).toBeUndefined()
      expect(validateVersionCallback('1.0.0', 'semver')).toBeUndefined()
      expect(validateVersionCallback('invalid', 'semver')).toBe('Must be semver format (x.y.z)')
      expect(validateVersionCallback('2024.01.01', 'calver')).toBeUndefined()
      expect(validateVersionCallback('invalid', 'calver')).toBe(
        'Must be calver format (YYYY.M.PATCH)'
      )
      expect(validateVersionCallback('anything', 'custom')).toBeUndefined()
    })
  })
})
