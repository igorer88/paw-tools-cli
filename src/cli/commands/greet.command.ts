import { Command, CommandRunner, Option } from 'nest-commander';

interface GreetCommandOptions {
  uppercase?: boolean;
}

@Command({ name: 'greet', description: 'Prints a greeting message' })
export class GreetCommand extends CommandRunner {
  async run(passedParam: string[], options?: GreetCommandOptions): Promise<void> {
    const name = passedParam[0] || 'World';
    let message = `Hello, ${name}!`;

    if (options?.uppercase) {
      message = message.toUpperCase();
    }

    console.log(message);
  }

  @Option({
    flags: '-u, --uppercase',
    description: 'Print the greeting in uppercase',
  })
  parseUppercase(): boolean {
    return true;
  }
}
