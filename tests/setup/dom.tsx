/**
 * Shared environment for the simple and comprehensive suites. jsdom has no
 * dialogs, Web Animations, media queries, ResizeObserver or clipboard, so the
 * app's real components get small stand-ins here. Clerk and next/link are
 * replaced so the app renders without a Clerk key or a Next router.
 */
import { afterEach, beforeEach, vi } from 'vitest';
import { MotionGlobalConfig } from 'motion';
import { resetEnv } from '../helpers/env';

// Motion's own switch for tests: every animation jumps to its end, so exit
// animations (AnimatePresence) finish and the next view mounts.
MotionGlobalConfig.skipAnimations = true;

vi.mock('@clerk/nextjs', () => {
	const auth = () => (globalThis as unknown as { __auth: { isLoaded: boolean; isSignedIn: boolean; failed: boolean } }).__auth;
	return {
		useAuth: () => auth(),
		// A Clerk that failed to load shows neither state, only its failure fallback.
		Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
			!auth().failed && (when === 'signed-in') === auth().isSignedIn ? <>{children}</> : null,
		ClerkFailed: ({ children }: { children: React.ReactNode }) => (auth().failed ? <>{children}</> : null),
		SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		UserButton: () => <span data-testid='user-button' />,
	};
});

vi.mock('next/link', () => ({
	default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Store actions, timers and fetches settle outside act() all the time in these flows;
// that warning is noise here. Every other console error still prints.
const consoleError = console.error;
console.error = (...args: unknown[]) => {
	if (typeof args[0] === 'string' && args[0].includes('not wrapped in act(')) return;
	consoleError(...args);
};

// <dialog>: showModal/close toggle `open`. Like browsers, `close` fires in a later
// task, not inside close() itself; tests that depend on it must flush().
if (!HTMLDialogElement.prototype.showModal) {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.show = HTMLDialogElement.prototype.showModal;
	HTMLDialogElement.prototype.close = function () {
		if (!this.hasAttribute('open')) return;
		this.removeAttribute('open');
		setTimeout(() => this.dispatchEvent(new Event('close')), 0);
	};
}

// Web Animations: every animation finishes at once.
if (!Element.prototype.animate) {
	Element.prototype.animate = function () {
		const anim = {
			finished: Promise.resolve(),
			cancel() {},
			finish() {},
			play() {},
			pause() {},
			onfinish: null,
		};
		return anim as unknown as Animation;
	};
}

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function () {};
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = function () {};
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = function () {};

class StubObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}
globalThis.ResizeObserver ??= StubObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= StubObserver as unknown as typeof IntersectionObserver;

beforeEach(() => resetEnv());

afterEach(() => {
	document.body.innerHTML = '';
	vi.unstubAllGlobals();
});
