export const CommandFactory = {
  createWithoutRunning: jest.fn(),
  run: jest.fn().mockResolvedValue(undefined),
  runApplication: jest.fn().mockResolvedValue(undefined)
}
