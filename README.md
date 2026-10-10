# Typed Config Kit

Parse environment variables at the edge of your application, get a typed, read-only config object, and see all invalid keys in one error. This tiny TypeScript library has no runtime dependencies. Its built-in parser errors do not echo input values.

## Quick start

Requires Node.js 20+ for the demo and TypeScript 5.9+ to build this repository.

```sh
npm install
npm run build
npm test
```

Use it from a TypeScript app:

```ts
import { boolean, integer, loadConfig, oneOf, optional, string, withDefault } from 'typed-config-kit';

const schema = {
  PORT: withDefault(integer({ min: 1, max: 65535 }), 3000),
  DEBUG: withDefault(boolean(), false),
  MODE: oneOf(['development', 'production']),
  API_TOKEN: optional(string({ minLength: 12 })),
};

const config = loadConfig(schema, process.env);
// config.PORT: number; config.MODE: 'development' | 'production'
```

Install this local package in another project with `npm install ../typed-config-kit` after building, or publish it under an available npm name if desired.

## Fields

`string({ minLength, maxLength, trim })`, `integer({ min, max })`, `boolean()`, and `oneOf(['a', 'b'])` are required by default. Wrap any parser with `optional(parser)` or `withDefault(parser, fallback)`. Boolean input accepts `true/false`, `1/0`, `yes/no`, and `on/off` (case insensitive). Integer input must be a safe integer written without decimal or exponent notation.

`withDefault` accepts a string, number, or boolean fallback and parses it through the field's rules when the source value is missing or blank. An invalid fallback is reported as a `ConfigError` for that key. Custom parsers with non-primitive outputs can implement their own default wrapper.

`loadConfig` collects every invalid field into `ConfigError.issues`. It returns a frozen top-level object. You pass the source explicitly, so it also works with test objects or other string maps. Custom `Field` parsers can be added; if they handle secrets, write error messages that do not reveal the raw input.

## Limits

This library checks values when `loadConfig` runs; it does not watch changes to the environment. It has no URL, date, nested schema, cross-field, or async validation. Call it once during startup and handle `ConfigError` before opening a server.

MIT licensed.
