import { afterEach } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DndContext } from '@dnd-kit/core';
import { App } from '@/components/shell/App';

export interface Mounted {
	container: HTMLElement;
	root: Root;
	rerender(ui: ReactNode): void;
	unmount(): void;
}

let mounted: Mounted[] = [];

/** Render into a fresh container attached to the document. */
export function render(ui: ReactNode): Mounted {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	act(() => root.render(ui));
	const m: Mounted = {
		container,
		root,
		rerender: (next) => act(() => root.render(next)),
		unmount: () => {
			act(() => root.unmount());
			container.remove();
			mounted = mounted.filter((x) => x !== m);
		},
	};
	mounted.push(m);
	return m;
}

/** Render inside a bare DndContext, for components that register draggables. */
export const renderWithDnd = (ui: ReactNode) => render(<DndContext>{ui}</DndContext>);

/** Mount the whole app and let persistence, validation and effects settle. */
export async function renderApp() {
	const m = render(<App />);
	await flush();
	return m;
}

export function unmountAll() {
	[...mounted].forEach((m) => m.unmount());
}

// Any file that renders unmounts everything after each test, before the DOM is cleared.
afterEach(unmountAll);

/** Let pending promises, timers at 0 ms and React updates run. */
export async function flush(times = 6) {
	for (let i = 0; i < times; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
}

/** Advance real time inside act, for debounced effects. */
export async function wait(ms: number) {
	await act(async () => new Promise((r) => setTimeout(r, ms)));
}

/** Retry an assertion until it passes or the time runs out. */
export async function waitFor<T>(check: () => T, timeout = 3000): Promise<T> {
	const start = Date.now();
	let last: unknown;
	while (Date.now() - start < timeout) {
		try {
			return check();
		} catch (e) {
			last = e;
			await act(async () => new Promise((r) => setTimeout(r, 15)));
		}
	}
	throw last;
}

// ---- Queries -------------------------------------------------------------

const textOf = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const matches = (value: string | null | undefined, want: string | RegExp) =>
	value != null && (typeof want === 'string' ? value === want : want.test(value));

/** Every element whose aria-label matches. */
export const allByLabel = (want: string | RegExp, scope: ParentNode = document) =>
	[...scope.querySelectorAll('[aria-label]')].filter((el) => matches(el.getAttribute('aria-label'), want)) as HTMLElement[];

export function byLabel<T extends HTMLElement = HTMLElement>(want: string | RegExp, scope: ParentNode = document): T {
	const found = allByLabel(want, scope);
	if (!found.length) throw new Error(`No element labelled ${want}`);
	return found[0] as T;
}

export const queryByLabel = (want: string | RegExp, scope: ParentNode = document) => allByLabel(want, scope)[0] ?? null;

/**
 * A control's accessible name the way a screen reader joins it: its text, sr-only text included, words kept apart.
 * Controls that name themselves by their visible text (team cards, suggestions, move slots) are found with `byName`.
 */
export const nameOf = (el: Element) => {
	const words: string[] = [];
	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) words.push(node.textContent ?? '');
		else node.childNodes.forEach(walk);
	};
	walk(el);
	return words.join(' ').replace(/\s+/g, ' ').replace(/ ([.,:])/g, '$1').trim();
};
/** A string matches the whole name, or its first words; a RegExp is tested against the name. */
const named = (name: string, want: string | RegExp) => (typeof want === 'string' ? name === want || name.startsWith(`${want} `) : want.test(name));

/** Every button (and button-like element) whose accessible name matches. */
export const allByName = (want: string | RegExp, scope: ParentNode = document) =>
	[...scope.querySelectorAll('button, [role="button"]')].filter((el) => named(nameOf(el), want)) as HTMLElement[];

export function byName<T extends HTMLElement = HTMLElement>(want: string | RegExp, scope: ParentNode = document): T {
	const found = allByName(want, scope);
	if (!found.length) throw new Error(`No button named ${want}`);
	return found[0] as T;
}

export const queryByName = (want: string | RegExp, scope: ParentNode = document) => allByName(want, scope)[0] ?? null;

/** Buttons (and button-like elements) whose visible text matches. */
export const allButtons = (want: string | RegExp, scope: ParentNode = document) =>
	[...scope.querySelectorAll('button, [role="button"], [role="tab"], [role="radio"]')].filter((el) =>
		matches(textOf(el), want)
	) as HTMLElement[];

export function button(want: string | RegExp, scope: ParentNode = document): HTMLButtonElement {
	const found = allButtons(want, scope);
	if (!found.length) throw new Error(`No button with text ${want}`);
	return found[0] as HTMLButtonElement;
}

export const queryButton = (want: string | RegExp, scope: ParentNode = document) => allButtons(want, scope)[0] ?? null;

/** Does any element's text contain this? */
export const hasText = (want: string | RegExp, scope: ParentNode = document.body) => {
	const text = textOf(scope as Element);
	return typeof want === 'string' ? text.includes(want) : want.test(text);
};

export const openDialog = () => document.querySelector<HTMLDialogElement>('dialog[open]');

// ---- Events --------------------------------------------------------------

export const click = (el: Element) => act(() => void (el as HTMLElement).click());

export const dblclick = (el: Element) =>
	act(() => void el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));

export const hover = (el: Element) =>
	act(() => {
		el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
		el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
	});

/** Set an input's value through the native setter React listens to, then fire input. */
export function type(el: Element, value: string) {
	const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
	act(() => {
		Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
		el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
	});
}

export const select = (el: HTMLSelectElement, value: string) => type(el, value);

export const key = (el: Element | Window, k: string, init: KeyboardEventInit = {}) =>
	act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })));

export const blur = (el: Element) =>
	act(() => {
		(el as HTMLElement).blur?.();
		el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
	});

export const focus = (el: Element) =>
	act(() => {
		(el as HTMLElement).focus?.();
		el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
	});
