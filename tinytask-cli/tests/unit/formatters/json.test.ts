import { describe, it, expect } from 'vitest';
import { JSONFormatter } from '../../../src/formatters/json.js';

describe('JSONFormatter', () => {
  it('should format as JSON', () => {
    const formatter = new JSONFormatter({ color: false, verbose: false });
    const data = { id: 1, title: 'Test' };
    const output = formatter.format(data);

    expect(JSON.parse(output)).toEqual(data);
  });

  it('should pretty print in verbose mode', () => {
    const formatter = new JSONFormatter({ color: false, verbose: true });
    const data = { id: 1, title: 'Test' };
    const output = formatter.format(data);

    expect(output).toContain('\n');
    expect(JSON.parse(output)).toEqual(data);
  });

  it('should format arrays', () => {
    const formatter = new JSONFormatter({ color: false, verbose: false });
    const data = [
      { id: 1, title: 'Test 1' },
      { id: 2, title: 'Test 2' },
    ];
    const output = formatter.format(data);

    expect(JSON.parse(output)).toEqual(data);
  });
});
