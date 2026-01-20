#!/usr/bin/env node

import { createCLI } from './cli.js';
import { handleError } from './utils/errors.js';
import { disconnect } from './client/connection.js';

async function main() {
  try {
    const cli = createCLI();
    await cli.parseAsync(process.argv);
    // Ensure client disconnects after command completes
    await disconnect();
  } catch (error) {
    await disconnect();
    handleError(error as Error);
  }
}

main();
