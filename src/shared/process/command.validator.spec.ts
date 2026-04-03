import { CommandValidator } from './command.validator'

describe('CommandValidator', () => {
  const validator = new CommandValidator()

  describe('validate', () => {
    it('should allow valid commands without special characters', () => {
      expect(() => validator.validate('echo hello')).not.toThrow()
      validator.validate('git status')
      validator.validate('npm run build')
    })

    it('should throw on command with semicolon', () => {
      expect(() => validator.validate('echo test; rm -rf /')).toThrow()
    })

    it('should throw on command with ampersand', () => {
      expect(() => validator.validate('echo test & malicious')).toThrow()
    })

    it('should throw on command with pipe', () => {
      expect(() => validator.validate('cat file | grep secret')).toThrow()
    })

    it('should throw on command with backticks', () => {
      expect(() => validator.validate('echo `whoami`')).toThrow()
    })

    it('should throw on command with dollar sign', () => {
      expect(() => validator.validate('echo $HOME')).toThrow()
    })

    it('should throw on command with parentheses', () => {
      expect(() => validator.validate('echo $(whoami)')).toThrow()
    })

    it('should throw on command with brackets', () => {
      expect(() => validator.validate('echo test[0]')).toThrow()
    })

    it('should throw on command with angle brackets', () => {
      expect(() => validator.validate('cat /etc/passwd > /dev/null')).toThrow()
    })

    it('should throw on command with backslash', () => {
      expect(() => validator.validate('echo test\\n')).toThrow()
    })

    it('should throw on command with vertical bar', () => {
      expect(() => validator.validate('echo test || echo fail')).toThrow()
    })
  })

  describe('validateArgs', () => {
    it('should allow valid arguments', () => {
      expect(() => validator.validateArgs(['status', 'main'])).not.toThrow()
    })

    it('should throw on argument with semicolon', () => {
      expect(() => validator.validateArgs(['status;', 'rm -rf /'])).toThrow()
    })

    it('should throw on argument with pipe', () => {
      expect(() => validator.validateArgs(['|', 'cat'])).toThrow()
    })

    it('should throw on argument with backticks', () => {
      expect(() => validator.validateArgs(['`ls`'])).toThrow()
    })

    it('should throw on argument with dollar sign', () => {
      expect(() => validator.validateArgs(['$PATH'])).toThrow()
    })

    it('should handle empty args array', () => {
      expect(() => validator.validateArgs([])).not.toThrow()
    })
  })
})
