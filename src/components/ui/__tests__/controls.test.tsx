import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NumberBox } from '../controls';

// The test environment has no user events, so input goes through the native setter that React listens to.
const type = (el: HTMLInputElement, value: string) => {
	Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		'value'
	)!.set!.call(el, value);
	el.dispatchEvent(new Event('input', { bubbles: true }));
};
const leave = (el: HTMLInputElement) =>
	el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const mount = (onCommit: (v: number) => void, value = 70) =>
	act(() =>
		root.render(
			<NumberBox
				label='Happiness'
				value={value}
				min={0}
				max={255}
				onCommit={onCommit}
			/>
		)
	);
const box = () =>
	container.querySelector<HTMLInputElement>('input[aria-label="Happiness"]')!;

describe('NumberBox', () => {
	it('only lets digits into the field', () => {
		mount(() => {});
		act(() => type(box(), '-5'));
		expect(box().value).toBe('70');
		act(() => type(box(), '12a'));
		expect(box().value).toBe('70');
	});

	it('marks an out-of-range entry, then commits it clamped to the range', () => {
		const onCommit = vi.fn();
		mount(onCommit);
		act(() => type(box(), '300'));
		expect(box().getAttribute('aria-invalid')).toBe('true');
		act(() => leave(box()));
		expect(onCommit).toHaveBeenCalledWith(255);
		expect(box().value).toBe('255');
	});

	it('reverts an empty entry to the stored value', () => {
		const onCommit = vi.fn();
		mount(onCommit);
		act(() => type(box(), ''));
		act(() => leave(box()));
		expect(onCommit).not.toHaveBeenCalled();
		expect(box().value).toBe('70');
	});
});
