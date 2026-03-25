import * as clack from '@clack/prompts'

import { PromptService } from './prompt.service'

jest.mock('@clack/prompts')

describe('PromptService', () => {
  let service: PromptService

  beforeEach(() => {
    ;(clack.text as jest.Mock).mockReset()
    ;(clack.select as jest.Mock).mockReset()
    ;(clack.confirm as jest.Mock).mockReset()
    ;(clack.spinner as jest.Mock).mockReset()
    ;(clack.cancel as jest.Mock).mockReset()
    ;(clack.isCancel as unknown as jest.Mock).mockReset()
    service = new PromptService()
  })

  describe('text', () => {
    it('should return text value when not cancelled', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)

      const result = await service.text({
        message: 'Enter name:',
        placeholder: 'name',
        defaultValue: 'default'
      })

      expect(result).toBe('test-value')
      expect(clack.text).toHaveBeenCalledWith({
        message: 'Enter name:',
        placeholder: 'name',
        defaultValue: 'default',
        validate: undefined
      })
    })

    it('should call validate function', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)
      const validate = jest.fn()

      await service.text({
        message: 'Enter name:',
        validate
      })

      expect(clack.text).toHaveBeenCalledWith({
        message: 'Enter name:',
        validate
      })
    })

    it('should exit when cancelled', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await service.text({ message: 'Enter name:' })

      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('select', () => {
    it('should return selected value when not cancelled', async () => {
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)

      const result = await service.select({
        message: 'Select package manager:',
        options: [
          { value: 'pnpm', label: 'pnpm' },
          { value: 'npm', label: 'npm' }
        ]
      })

      expect(result).toBe('pnpm')
      expect(clack.select).toHaveBeenCalledWith({
        message: 'Select package manager:',
        options: [
          { value: 'pnpm', label: 'pnpm' },
          { value: 'npm', label: 'npm' }
        ]
      })
    })

    it('should exit when cancelled', async () => {
      ;(clack.select as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await service.select({
        message: 'Select option:',
        options: [{ value: 'a', label: 'A' }]
      })

      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('confirm', () => {
    it('should return true when confirmed', async () => {
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)

      const result = await service.confirm({ message: 'Continue?' })

      expect(result).toBe(true)
      expect(clack.confirm).toHaveBeenCalledWith({ message: 'Continue?' })
    })

    it('should return false when rejected', async () => {
      ;(clack.confirm as jest.Mock).mockResolvedValue(false)
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)

      const result = await service.confirm({ message: 'Continue?' })

      expect(result).toBe(false)
    })

    it('should exit when cancelled', async () => {
      ;(clack.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await service.confirm({ message: 'Continue?' })

      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('spinner', () => {
    it('should execute function and stop with Done', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      const fn = jest.fn().mockResolvedValue('result')

      const result = await service.spinner({ message: 'Working...' }, fn)

      expect(result).toBe('result')
      expect(mockSpinner.start).toHaveBeenCalledWith('Working...')
      expect(mockSpinner.stop).toHaveBeenCalledWith('Done')
    })

    it('should stop with Failed on error', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      const error = new Error('test error')
      const fn = jest.fn().mockRejectedValue(error)

      await expect(service.spinner({ message: 'Working...' }, fn)).rejects.toThrow(error)
      expect(mockSpinner.start).toHaveBeenCalledWith('Working...')
      expect(mockSpinner.stop).toHaveBeenCalledWith('Failed')
    })
  })

  describe('spinnerMessage', () => {
    it('should return start and stop functions', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)

      const { start, stop } = service.spinnerMessage({ message: 'Working...' })

      start()
      stop('Done')

      expect(mockSpinner.start).toHaveBeenCalledWith('Working...')
      expect(mockSpinner.stop).toHaveBeenCalledWith('Done')
    })
  })
})
