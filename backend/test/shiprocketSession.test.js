const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MemoryDb } = require('./helpers/memoryDb');
const shiprocket = require('../lib/shiprocket');

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function withMockFetch(tokens) {
  let calls = 0;
  globalThis.fetch = async (url, opts) => {
    calls += 1;
    const token = Array.isArray(tokens) ? tokens[Math.min(calls - 1, tokens.length - 1)] : tokens;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ token }),
    };
  };
  return { calls: () => calls, reset: () => { calls = 0; } };
}

function setupEnv() {
  process.env.SHIPROCKET_EMAIL = 'store@example.test';
  process.env.SHIPROCKET_PASSWORD = 'secret';
}

function teardown() {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  shiprocket.resetToken();
  shiprocket.setTokenStore(null);
}

test('the Firestore session store round-trips token and expiry', async () => {
  setupEnv();
  try {
    const db = new MemoryDb();
    const store = shiprocket.createTokenStore(db);
    assert.equal(await store.read(), null);

    const expiresAt = Date.now() + 60 * 60 * 1000;
    await store.write({ token: 'TOKEN-ABC', expiresAt });
    const session = await store.read();
    assert.equal(session.token, 'TOKEN-ABC');
    assert.equal(session.expiresAt, expiresAt);
  } finally {
    teardown();
  }
});

test('login reuses a persisted session across instances without logging in again', async () => {
  setupEnv();
  try {
    const mock = withMockFetch('TOKEN-FRESH');
    const db = new MemoryDb();
    shiprocket.setTokenStore(shiprocket.createTokenStore(db));

    assert.equal(await shiprocket.login(), 'TOKEN-FRESH');
    assert.equal(mock.calls(), 1);

    // A different "instance" (memory reset + fresh store over the same db)
    // must reuse the stored session instead of hitting the network.
    shiprocket.resetToken();
    shiprocket.setTokenStore(shiprocket.createTokenStore(db));
    assert.equal(await shiprocket.login(), 'TOKEN-FRESH');
    assert.equal(mock.calls(), 1);
  } finally {
    teardown();
  }
});

test('an expired persisted session triggers a fresh login and refresh', async () => {
  setupEnv();
  try {
    const mock = withMockFetch('TOKEN-FRESH');
    const db = new MemoryDb();
    const store = shiprocket.createTokenStore(db);
    await store.write({ token: 'TOKEN-STALE', expiresAt: Date.now() - 5 * 1000 });
    shiprocket.setTokenStore(store);

    assert.equal(await shiprocket.login(), 'TOKEN-FRESH');
    assert.equal(mock.calls(), 1);
    const session = await store.read();
    assert.equal(session.token, 'TOKEN-FRESH');
  } finally {
    teardown();
  }
});