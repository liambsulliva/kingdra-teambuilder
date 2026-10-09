import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LazyImg } from '../Skeleton';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const pulse = () => container.querySelector('.animate-pulse');
const img = () => container.querySelector('img')!;

describe('LazyImg', () => {
	it('pulses a skeleton and keeps the image transparent until it loads', () => {
		act(() => root.render(<LazyImg src='/sprite.png' alt='Pikachu' size={56} />));
		expect(pulse()).not.toBeNull();
		expect(img().getAttribute('loading')).toBe('lazy');
		expect(img().className).toContain('opacity-0');
	});

	it('removes the skeleton and fades the image in once it has loaded', () => {
		act(() => root.render(<LazyImg src='/sprite.png' alt='Pikachu' size={56} />));
		act(() => {
			img().dispatchEvent(new Event('load'));
		});
		expect(pulse()).toBeNull();
		expect(img().className).toContain('opacity-100');
	});

	it('shows a skeleton again for a new source', () => {
		act(() => root.render(<LazyImg src='/a.png' alt='A' size={56} />));
		act(() => {
			img().dispatchEvent(new Event('load'));
		});
		act(() => root.render(<LazyImg src='/b.png' alt='B' size={56} />));
		expect(pulse()).not.toBeNull();
		expect(img().className).toContain('opacity-0');
	});
});
