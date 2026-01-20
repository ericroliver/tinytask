import { Formatter, FormatterOptions } from './types.js';
import { TableFormatter } from './table.js';
import { JSONFormatter } from './json.js';
import { CSVFormatter } from './csv.js';
import { CompactFormatter } from './compact.js';

export * from './types.js';

export function createFormatter(
  type: 'table' | 'json' | 'csv' | 'compact',
  options: FormatterOptions
): Formatter {
  switch (type) {
    case 'table':
      return new TableFormatter(options);
    case 'json':
      return new JSONFormatter(options);
    case 'csv':
      return new CSVFormatter(options);
    case 'compact':
      return new CompactFormatter(options);
    default:
      return new TableFormatter(options);
  }
}
