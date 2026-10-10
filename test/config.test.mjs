import test from 'node:test';
import assert from 'node:assert/strict';
import { boolean, ConfigError, integer, loadConfig, oneOf, optional, string, withDefault } from '../dist/index.js';

const schema = {
  PORT: withDefault(integer({ min: 1, max: 65535 }), 3000),
  DEBUG: withDefault(boolean(), false),
  MODE: oneOf(['dev', 'prod']),
  TOKEN: optional(string({ minLength: 3 }))
};

test('parses and freezes typed settings', () => {
  const result = loadConfig(schema, { MODE: 'prod', PORT: '8080', DEBUG: 'yes', TOKEN: ' abc ' });
  assert.deepEqual(result, { PORT: 8080, DEBUG: true, MODE: 'prod', TOKEN: 'abc' });
  assert.equal(Object.isFrozen(result), true);
});

test('defaults and optional values handle missing inputs', () => {
  assert.deepEqual(loadConfig(schema, { MODE: 'dev' }), { PORT: 3000, DEBUG: false, MODE: 'dev', TOKEN: undefined });
});

test('default values must satisfy their field parser', () => {
  assert.throws(() => loadConfig({ PORT: withDefault(integer({ min: 1 }), 0) }, {}), (error) => {
    assert.ok(error instanceof ConfigError);
    assert.deepEqual(error.issues.map((issue) => issue.key), ['PORT']);
    assert.match(error.message, /at least 1/);
    return true;
  });
  assert.deepEqual(loadConfig({ DEBUG: withDefault(boolean(), false) }, {}), { DEBUG: false });
});

test('collects errors without echoing secrets', () => {
  assert.throws(() => loadConfig(schema, { PORT: '0', MODE: 'secret-mode', TOKEN: 'x' }), (error) => {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.issues.length, 3);
    assert.doesNotMatch(error.message, /secret-mode/);
    return true;
  });
});

test('rejects floating point and unsafe integers', () => {
  assert.throws(() => integer().parse('1.5', 'X'), /integer/);
  assert.throws(() => integer().parse('9007199254740992', 'X'), /safe integer/);
});
