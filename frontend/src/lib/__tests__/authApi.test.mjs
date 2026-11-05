import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { signIn, signInDemo, restoreSession, restoreDemoSession, SignInRequiredError, ServerOfflineError } from '../authApi.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const signal = () => new AbortController().signal;

test('demo login and restoration require no backend requests', () => {
    let requests = 0;
    globalThis.fetch = async () => { requests++; throw new Error('Demo must not fetch'); };
    const session = signInDemo('admin', 'admin123');
    assert.equal(session.demo, true);
    assert.equal(session.username, 'admin');
    assert.deepEqual(restoreDemoSession(session.token), session);
    assert.throws(() => signInDemo('admin', 'wrong'), SignInRequiredError);
    assert.throws(() => signInDemo('other', 'admin123'), SignInRequiredError);
    assert.equal(requests, 0);
});

test('live login does not silently become a demo on outages or rejected credentials', async () => {
    for (const status of [401, 403, 429, 503]) {
        globalThis.fetch = async () => new Response('', { status });
        await assert.rejects(signIn('admin', 'admin123'));
    }
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(signIn('admin', 'admin123'), ServerOfflineError);
});

test('online login and restore use the server session', async () => {
    const online = { token: 'signed-token', username: 'admin', expiresAt: Date.now() + 10000 };
    globalThis.fetch = async (url, options) => {
        if (url.endsWith('/auth/session')) assert.equal(options.headers.Authorization, 'Bearer signed-token');
        return Response.json(online);
    };
    assert.deepEqual(await signIn('admin', 'admin123'), online);
    assert.deepEqual(await restoreSession(online.token, signal()), online);
});

test('demo sessions never authorize live API requests; expired and foreign markers are rejected', async () => {
    let requests = 0;
    globalThis.fetch = async () => { requests++; throw new Error('Unexpected request'); };
    const session = signInDemo('admin', 'admin123');
    await assert.rejects(restoreSession(session.token, signal()), SignInRequiredError);
    await assert.rejects(restoreSession('offline-admin:123', signal()), SignInRequiredError);
    for (const token of ['demo-admin:1', 'demo-admin:NaN', 'signed-token', `demo-admin:${Date.now() + 40 * 86400000}`]) {
        assert.throws(() => restoreDemoSession(token), SignInRequiredError);
    }
    assert.equal(requests, 0);
});

test('cancelled live requests do not create demo sessions', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async () => { throw controller.signal.reason; };
    await assert.rejects(signIn('admin', 'admin123', controller.signal), { name: 'AbortError' });
});
