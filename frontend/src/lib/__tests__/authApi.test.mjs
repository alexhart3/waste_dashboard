import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { signIn, restoreSession, restoreDashboardSession, SignInRequiredError } from '../authApi.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const signal = () => new AbortController().signal;
const offline = () => { globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); }; };

test('unreachable server permits only the requested offline credentials', async () => {
    offline();
    const session = await signIn('admin', 'admin123');
    assert.equal(session.offline, true);
    assert.equal(session.username, 'admin');
    assert.ok(session.expiresAt > Date.now());
    await assert.rejects(signIn('admin', 'wrong'), /Server offline/);
    await assert.rejects(signIn('other', 'admin123'), /Server offline/);
});

test('server rejection never falls back to offline access', async () => {
    for (const status of [401, 403, 429]) {
        globalThis.fetch = async () => new Response('', { status });
        await assert.rejects(signIn('admin', 'admin123'));
    }
});

test('service outage permits offline login and online login still returns server token', async () => {
    globalThis.fetch = async () => new Response('', { status: 503 });
    assert.equal((await signIn('admin', 'admin123')).offline, true);
    const online = { token: 'signed-token', username: 'admin', expiresAt: Date.now() + 10000 };
    globalThis.fetch = async () => Response.json(online);
    assert.deepEqual(await signIn('admin', 'admin123'), online);
});

test('saved offline sign-in preserves expiry and never authorizes exports', async () => {
    offline();
    const session = await signIn('admin', 'admin123');
    assert.deepEqual(await restoreDashboardSession(session.token, signal()), session);
    let requests = 0;
    globalThis.fetch = async () => { requests++; throw new Error('Unexpected request'); };
    await assert.rejects(restoreSession(session.token, signal()), SignInRequiredError);
    await assert.rejects(restoreDashboardSession('offline-admin:1', signal()), SignInRequiredError);
    await assert.rejects(restoreDashboardSession('offline-admin:NaN', signal()), SignInRequiredError);
    assert.equal(requests, 0);
});

test('retry exchanges offline session for a real server session', async () => {
    offline();
    const session = await signIn('admin', 'admin123');
    const online = { token: 'real-token', username: 'admin', expiresAt: Date.now() + 10000 };
    globalThis.fetch = async (url, options) => {
        assert.ok(url.endsWith('/auth/login'));
        assert.deepEqual(JSON.parse(options.body), { username: 'admin', password: 'admin123' });
        assert.equal(options.headers.Authorization, undefined);
        return Response.json(online);
    };
    assert.deepEqual(await restoreDashboardSession(session.token, signal()), online);
});

test('cancelled requests do not create offline sessions', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async () => { throw controller.signal.reason; };
    await assert.rejects(signIn('admin', 'admin123', controller.signal), { name: 'AbortError' });
});
