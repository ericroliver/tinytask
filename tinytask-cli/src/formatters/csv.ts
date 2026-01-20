import { Formatter, FormatterOptions } from './types.js';

export class CSVFormatter implements Formatter {
  constructor(private options: FormatterOptions) {}

  format(data: unknown): string {
    // Handle structured responses (comments, links, etc.)
    let items: unknown[];
    if (Array.isArray(data)) {
      items = data;
    } else if (
      typeof data === 'object' &&
      data !== null &&
      'links' in data &&
      Array.isArray((data as Record<string, unknown>).links)
    ) {
      // Extract links array from structured response
      items = (data as Record<string, unknown>).links as unknown[];
    } else if (
      typeof data === 'object' &&
      data !== null &&
      'comments' in data &&
      Array.isArray((data as Record<string, unknown>).comments)
    ) {
      // Extract comments array from structured response
      items = (data as Record<string, unknown>).comments as unknown[];
    } else {
      items = [data];
    }

    if (items.length === 0) {
      return '';
    }

    // Get headers from first object
    const firstItem = items[0] as Record<string, unknown>;
    const headers = Object.keys(firstItem);

    // Format header row
    const lines = [this.formatRow(headers)];

    // Format data rows
    items.forEach((item) => {
      const values = headers.map((h) => this.formatValue((item as Record<string, unknown>)[h]));
      lines.push(this.formatRow(values));
    });

    return lines.join('\n');
  }

  private formatRow(values: string[]): string {
    return values.map((v) => this.escapeCSV(v)).join(',');
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.join(';');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
