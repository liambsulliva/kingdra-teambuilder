// @vitest-environment node
// The proxy is server middleware. In the default browser-like environment, a production build
// (Vercel sets NODE_ENV=production) resolves Node built-ins such as node:async_hooks to empty
// stubs, and Clerk's `new AsyncLocalStorage()` throws as the module loads.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, type NextFetchEvent } from 'next/server';

// Clerk reads its keys when the module loads, so they are set before the proxy is imported.
// The keys are fakes: the proxy only derives the Frontend API host and passes the secret through.
vi.hoisted(() => {
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsuZXhhbXBsZS5jb20k';
	process.env.CLERK_SECRET_KEY = 'sk_live_fake';
});

import proxy, { config } from '@/proxy';

const query = '__clerk_api_version=2026-05-12&_clerk_js_version=6.39.0';
type Upstream = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// The proxy branch never touches the fetch event, so a stub with waitUntil is enough.
const run = (middleware: typeof proxy, url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
	middleware(new NextRequest(url, init), { waitUntil: () => {} } as unknown as NextFetchEvent);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe('Clerk Frontend API proxy', () => {
	// clerk-js sends sign-in and session calls to /__clerk on *.vercel.app. If the matcher
	// drops that path, Next answers 404 before the middleware runs.
	it('is matched by the middleware', () => {
		expect(config.matcher).toContain('/__clerk(.*)');
	});

	it('forwards /__clerk calls for a live instance', async () => {
		const upstream = vi.fn<Upstream>(async () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }));
		vi.stubGlobal('fetch', upstream);

		const res = await run(proxy, `https://kingdra.vercel.app/__clerk/v1/client/sign_ins?${query}`, { method: 'POST' });

		expect(upstream).toHaveBeenCalledTimes(1);
		expect(String(upstream.mock.calls[0][0])).toContain('/v1/client/sign_ins');
		expect(res?.status).toBe(200);
		expect(await res?.text()).toBe('{"ok":true}');
	});

	it('leaves development keys talking to Clerk directly', async () => {
		vi.resetModules();
		vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k');
		const { default: devProxy } = await import('@/proxy');
		const upstream = vi.fn<Upstream>(async () => new Response('{}'));
		vi.stubGlobal('fetch', upstream);

		await run(devProxy, `https://kingdra-git-preview.vercel.app/__clerk/v1/environment?${query}`);

		expect(upstream).not.toHaveBeenCalled();
	});
});
