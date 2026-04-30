import { MockProcessService } from '@mocks/shared'
import { DependencyService } from './dependency.service'

describe('DependencyService', () => {
  let service: DependencyService
  let mockProcess: MockProcessService

  beforeEach(() => {
    mockProcess = new MockProcessService()
    service = new DependencyService(mockProcess as any)
  })

  describe('which', () => {
    it('should return path when command exists', () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = service.which('git')
      expect(result).toBe('/usr/bin/git')
    })

    it('should return null when command does not exist', () => {
      mockProcess.setNotFound('nonexistent')
      const result = service.which('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('check', () => {
    it('should return empty missing and warnings when git is installed', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return missing when command not found', async () => {
      mockProcess.setNotFound('nonexistent-xyz-12345')
      const result = await service.check([{ name: 'nonexistent-xyz-12345' }])

      expect(result.missing).toHaveLength(1)
      expect(result.missing[0].name).toBe('nonexistent-xyz-12345')
    })

    it('should handle null installed version', async () => {
      mockProcess.setVersion('myapp', '')
      // which returns a path but getVersion returns empty string
      mockProcess.which = jest.fn().mockReturnValue('/usr/bin/myapp')
      mockProcess.getVersion = jest.fn().mockResolvedValue('')
      const result = await service.check([{ name: 'myapp', version: '>=1.0.0' }])

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].installedVersion).toBeNull()
      expect(result.missing).toHaveLength(0)
    })

    it('should check semver >= version constraint', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git', version: '>=2.0.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return warning when semver version requirement not met', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git', version: '>=99.0.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].name).toBe('git')
    })

    it('should check caret ^ version', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git', version: '^2.0.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should check tilde ~ version', async () => {
      mockProcess.setVersion('git', '2.1.5')
      const result = await service.check([{ name: 'git', version: '~2.1.0' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should check exact match version', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git', version: '2.50.1' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should return warning when exact match fails', async () => {
      mockProcess.setVersion('git', '2.50.1')
      const result = await service.check([{ name: 'git', version: '2.50.2' }])

      expect(result.missing).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
    })

    it('should handle multiple dependencies', async () => {
      mockProcess.setVersion('git', '2.50.1')
      mockProcess.setNotFound('nonexistent-xyz-12345')
      const result = await service.check([{ name: 'git' }, { name: 'nonexistent-xyz-12345' }])

      expect(result.missing).toHaveLength(1)
      expect(result.missing[0].name).toBe('nonexistent-xyz-12345')
    })

    it('should skip optional dependencies that are not installed', async () => {
      mockProcess.setVersion('git', '2.50.1')
      mockProcess.setNotFound('nonexistent-xyz-12345')
      const result = await service.check([
        { name: 'git' },
        { name: 'nonexistent-xyz-12345', isRequired: false }
      ])

      expect(result.missing).toHaveLength(0)
    })

    describe('calver version comparison', () => {
      it('should check calver >= version constraint', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        const result = await service.check([{ name: 'myapp', version: '>=2024.1.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return warning when calver version requirement not met', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        const result = await service.check([{ name: 'myapp', version: '>=2025.1.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].name).toBe('myapp')
      })

      it('should handle calver exact match for ^ and ~ prefixes', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        // ^ and ~ for calver fall back to exact match
        const result = await service.check([{ name: 'myapp', version: '^2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return warning for calver when exact match fails', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        const result = await service.check([{ name: 'myapp', version: '^2024.4.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })
    })

    describe('version format validation', () => {
      it('should return warning when installed version is neither semver nor calver', async () => {
        mockProcess.setVersion('myapp', 'abc-invalid')
        const result = await service.check([{ name: 'myapp', version: '>=1.0.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should handle mixed format comparison (calver installed, semver required)', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        const result = await service.check([{ name: 'myapp', version: '>=2.0.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should handle mixed format comparison (semver installed, calver required)', async () => {
        mockProcess.setVersion('myapp', '2.50.1')
        const result = await service.check([{ name: 'myapp', version: '>=2024.1.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should return warning when semver installed but required is not semver format', async () => {
        mockProcess.setVersion('myapp', '2.50.1')
        const result = await service.check([{ name: 'myapp', version: '>=2024.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should return warning when installed version is neither semver nor calver (line 82)', async () => {
        mockProcess.setVersion('myapp', 'abc-invalid')
        const result = await service.check([{ name: 'myapp', version: '>=1.0.0' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })
    })

    describe('satisfiesGte edge cases', () => {
      it('should handle equal versions', async () => {
        mockProcess.setVersion('git', '2.50.1')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle patch version comparison', async () => {
        mockProcess.setVersion('git', '2.50.5')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return true when major version greater', async () => {
        mockProcess.setVersion('git', '3.0.0')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return true when minor version greater but same major', async () => {
        mockProcess.setVersion('git', '2.51.0')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return false when major version lower', async () => {
        mockProcess.setVersion('git', '1.50.1')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should return false when minor version lower but same major', async () => {
        mockProcess.setVersion('git', '2.49.0')
        const result = await service.check([{ name: 'git', version: '>=2.50.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })
    })

    describe('satisfiesGteCalver edge cases', () => {
      it('should handle equal calver versions', async () => {
        mockProcess.setVersion('myapp', '2024.3.1')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle calver month comparison', async () => {
        mockProcess.setVersion('myapp', '2024.5.1')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle calver patch comparison', async () => {
        mockProcess.setVersion('myapp', '2024.3.5')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return true when calver year greater', async () => {
        mockProcess.setVersion('myapp', '2025.1.0')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return true when calver month greater but same year', async () => {
        mockProcess.setVersion('myapp', '2024.6.0')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should return false when calver year lower', async () => {
        mockProcess.setVersion('myapp', '2023.12.0')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })

      it('should return false when calver month lower but same year', async () => {
        mockProcess.setVersion('myapp', '2024.2.0')
        const result = await service.check([{ name: 'myapp', version: '>=2024.3.1' }])

        expect(result.missing).toHaveLength(0)
        expect(result.warnings).toHaveLength(1)
      })
    })
  })
})
