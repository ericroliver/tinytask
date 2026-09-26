export interface FormatterOptions {
  color: boolean;
  verbose: boolean;
  /** Ordered field names to render (from `--fields` projection); when set, only these fields are shown. */
  fields?: string[];
}

export interface Formatter<T = unknown> {
  format(data: T): string;
}
