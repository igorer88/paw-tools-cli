import { ProcessService } from '../process/process.service'
import { DependencyService } from './dependency.service'

describe('DependencyService', () => {
  const service = new DependencyService(new ProcessService())

  describe('check', () => {
    it('should return empty missing and warnings when git is installed', async () => {
      const result = await service.check([{ name: 'git' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return missing when command not found', async () => {
      const result = await service.check([{ name: 'nonexistent-xyz-12345' }])

      expect(result.missing).toHaveLength(1)
      expect(result.missing[0].name).toBe('nonexistent-xyz-12345')
    })

    it('should check version constraint >=', async () => {
      const result = await service.check([{ name: 'git', version: '>=2.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return warning when version requirement not met', async () => {
      const result = await service.check([{ name: 'git', version: '>=99.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].name).toBe('git')
    })

    it('should check caret ^ version', async () => {
      const result = await service.check([{ name: 'git', version: '^2.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle multiple dependencies', async () => {
      const result = await service.check([{ name: 'git' }, { name: 'nonexistent-xyz-12345' }])

      expect(result.missing).toHaveLength(1)
      expect(result.missing[0].name).toBe('nonexistent-xyz-12345')
    })

    it('should skip optional dependencies that are not installed', async () => {
      const result = await service.check([
        { name: 'git' },
        { name: 'nonexistent-xyz-12345', isRequired: false }
      ])

      expect(result.missing).toHaveLength(0)
    })
  })
})
