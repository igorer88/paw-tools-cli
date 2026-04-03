import { CommandValidator } from './command.validator'
import { ProcessService } from './process.service'

describe('ProcessService', () => {
  const service = new ProcessService()

  describe('exec', () => {
    it('should execute a command and return stdout', async () => {
      const result = await service.exec('echo "hello"')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello')
      expect(result.stderr).toBe('')
    })

    it('should return error on failed command', async () => {
      const result = await service.exec('exit 1')

      expect(result.exitCode).toBe(1)
      expect(result.error).toBeDefined()
    })

    it('should return error on validation failure', async () => {
      const result = await service.exec('echo test; rm -rf /')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('dangerous shell characters')
      expect(result.error).toBeDefined()
    })
  })

  describe('execSync', () => {
    it('should execute a command synchronously', () => {
      const result = service.execSync('echo "sync hello"')

      expect(result).toBe('sync hello')
    })

    it('should throw on failed command', () => {
      expect(() => service.execSync('exit 1')).toThrow()
    })

    it('should throw on validation failure', () => {
      expect(() => service.execSync('echo $HOME')).toThrow()
    })
  })

  describe('spawn', () => {
    it('should return a ChildProcess', () => {
      const child = service.spawn('echo', ['spawned'])

      expect(child).toBeDefined()
      expect(child.kill).toBeDefined()
    })

    it('should throw on dangerous arguments', () => {
      expect(() => service.spawn('echo', ['test; rm -rf /'])).toThrow()
    })
  })

  describe('CommandValidator integration', () => {
    it('should validate commands using CommandValidator', () => {
      const validator = new CommandValidator()
      expect(() => validator.validate('echo test')).not.toThrow()
      expect(() => validator.validate('echo $PATH')).toThrow()
    })
  })
})
