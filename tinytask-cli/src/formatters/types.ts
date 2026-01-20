export interface FormatterOptions {
  color: boolean;
  verbose: boolean;
}

export interface Formatter<T = unknown> {
  format(data: T): string;
}
