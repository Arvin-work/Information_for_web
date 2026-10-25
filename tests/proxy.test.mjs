import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { apiProxy, configureAuthProxy } from '../scripts/dev-proxy.mjs';

test('development proxy rewrites only the exact local frontend Origin', () => {
  assert.equal(apiProxy.target, 'http://localhost:8787');
  assert.equal(apiProxy.changeOrigin, true);
  for (const origin of [
    undefined,
    'https://evil.example',
    'http://localhost:4321.evil.example',
    'null',
    'http://localhost:4321',
  ]) {
    const proxy = new EventEmitter();
    configureAuthProxy(proxy);
    const changed = {};
    proxy.emit(
      'proxyReq',
      {
        setHeader: (name, value) => {
          changed[name] = value;
        },
      },
      { headers: { origin } },
    );
    assert.deepEqual(
      changed,
      origin === 'http://localhost:4321'
        ? { Origin: 'http://localhost:8787' }
        : {},
    );
  }
});
