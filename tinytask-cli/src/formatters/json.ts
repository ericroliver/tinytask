import { Formatter, FormatterOptions } from './types.js';

export class JSONFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}

  format(data: unknown): string {
    return JSON.stringify(data, null, this.options.verbose ? 2 : 0);
  }
}
