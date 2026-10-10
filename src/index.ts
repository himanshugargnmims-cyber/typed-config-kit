/** A field parser receives one raw environment value and returns a typed value. */
export interface Field<T> {
  parse(raw: string | undefined, key: string): T;
}

export type InferSchema<S extends Record<string, Field<unknown>>> = {
  readonly [K in keyof S]: S[K] extends Field<infer T> ? T : never;
};

export interface ConfigIssue { readonly key: string; readonly message: string }

/** Contains field names and parser errors. Built-in parsers never echo input values. */
export class ConfigError extends Error {
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    super(`Invalid configuration:\n${issues.map(({ key, message }) => `- ${key}: ${message}`).join('\n')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

function required(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') throw new Error('is required');
  return raw.trim();
}

export function string(options: { minLength?: number; maxLength?: number; trim?: boolean } = {}): Field<string> {
  return {
    parse(raw) {
      const value = options.trim === false ? raw : raw?.trim();
      if (value === undefined || value === '') throw new Error('is required');
      if (options.minLength !== undefined && value.length < options.minLength) throw new Error(`must have at least ${options.minLength} characters`);
      if (options.maxLength !== undefined && value.length > options.maxLength) throw new Error(`must have at most ${options.maxLength} characters`);
      return value;
    }
  };
}

export function integer(options: { min?: number; max?: number } = {}): Field<number> {
  return {
    parse(raw) {
      const value = required(raw);
      if (!/^[+-]?\d+$/.test(value)) throw new Error('must be an integer');
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) throw new Error('must be a safe integer');
      if (options.min !== undefined && parsed < options.min) throw new Error(`must be at least ${options.min}`);
      if (options.max !== undefined && parsed > options.max) throw new Error(`must be at most ${options.max}`);
      return parsed;
    }
  };
}

export function boolean(): Field<boolean> {
  return {
    parse(raw) {
      const value = required(raw).toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(value)) return true;
      if (['false', '0', 'no', 'off'].includes(value)) return false;
      throw new Error('must be true/false, 1/0, yes/no, or on/off');
    }
  };
}

export function oneOf<const T extends readonly [string, ...string[]]>(choices: T): Field<T[number]> {
  return {
    parse(raw) {
      const value = required(raw);
      if (!choices.includes(value)) throw new Error(`must be one of: ${choices.join(', ')}`);
      return value as T[number];
    }
  };
}

export function optional<T>(field: Field<T>): Field<T | undefined> {
  return { parse(raw, key) { return raw === undefined || raw.trim() === '' ? undefined : field.parse(raw, key); } };
}

export function withDefault<T extends string | number | boolean>(field: Field<T>, fallback: T): Field<T> {
  return { parse(raw, key) { return field.parse(raw === undefined || raw.trim() === '' ? String(fallback) : raw, key); } };
}

/** Parses all fields and reports every invalid key in one error. */
export function loadConfig<const S extends Record<string, Field<unknown>>>(
  schema: S,
  source: Readonly<Record<string, string | undefined>>
): InferSchema<S> {
  const result: Record<string, unknown> = {};
  const issues: ConfigIssue[] = [];
  for (const [key, field] of Object.entries(schema)) {
    try { result[key] = field.parse(source[key], key); }
    catch (error) { issues.push({ key, message: error instanceof Error ? error.message : 'is invalid' }); }
  }
  if (issues.length) throw new ConfigError(issues);
  return Object.freeze(result) as InferSchema<S>;
}
