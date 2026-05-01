export const CommandFactory = {
  createWithoutRunning: jest.fn(),
  run: jest.fn().mockResolvedValue(undefined),
  runApplication: jest.fn().mockResolvedValue(undefined)
}

export class CommandRunner {
  async run(): Promise<void> {}
}

export function Command(): ClassDecorator {
  return (target) => target
}

export function Option(): PropertyDecorator {
  return () => {}
}
