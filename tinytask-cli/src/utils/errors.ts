import chalk from 'chalk';

export class TinyTaskError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'TinyTaskError';
  }
}

export function handleError(error: Error): void {
  if (error instanceof TinyTaskError) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.code) {
      console.error(chalk.gray(`Code: ${error.code}`));
    }
  } else {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
  }

  if (process.env.TINYTASK_VERBOSE) {
    console.error(chalk.gray(error.stack || ''));
  }

  process.exit(1);
}
