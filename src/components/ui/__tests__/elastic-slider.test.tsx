import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ElasticSlider } from '../motion-ui';
import { useStore } from '@/lib/store';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// A 100 px track starting at x = 0.
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 100, 16));
	// The test DOM has no pointer capture.
	Element.prototype.setPointerCapture ??= () => {};
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
	useStore.setState({ fancyMotion: true });
});

const bar = (value: number, identity = 'a') => (
	<ElasticSlider label='Speed EVs' value={value} max={252} step={4} identity={identity} onChange={() => {}} />
);
const mount = (value = 252, identity = 'a') => act(() => root.render(bar(value, identity)));
/** Lets the bar's animation run for `ms`. */
const settle = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const slider = () => container.querySelector<HTMLElement>('[role="slider"]')!;
const [, fill, thumb] = [0, 1, 2].map((i) => () => slider().children[i] as HTMLElement);
/** The bar past the right end, the one past the left end, and the round handle. */
const tail = () => fill().children[0] as HTMLElement;
const handle = () => thumb().children[0] as HTMLElement;
const pointer = (type: string, clientX: number) =>
	act(() => {
		slider().dispatchEvent(new MouseEvent(type, { bubbles: true, clientX }) as PointerEvent);
	});

/** Drag 60 px past the right end of the track. */
const overdrag = () => {
	pointer('pointerdown', 90);
	pointer('pointermove', 160);
};

describe('elastic slider', () => {
	it('stretches past the end and springs back with an overshoot', () => {
		mount();
		overdrag();
		expect(tail().style.width).toMatch(/^[1-4]\.\d+px$/);
		expect(handle().style.transform).toMatch(/^translateX\([1-4]\.\d+px\)$/);
		pointer('pointerup', 160);
		expect(handle().style.transform).toBe('translateX(0px)');
		expect(tail().style.width).toBe('0px');
		expect(handle().style.transition).toContain('cubic-bezier(0.34, 1.7, 0.5, 1)');
		expect(tail().style.transition).toContain('cubic-bezier(0.34, 1.7, 0.5, 1)');
	});

	it('glides to a new value of the same Pokémon without overshooting', async () => {
		mount(252, 'a');
		await settle(20);
		act(() => root.render(bar(100, 'a')));
		await settle(400);
		expect(thumb().style.left).toBe(`${(100 / 252) * 100}%`);
		expect(fill().style.width).toBe(`${(100 / 252) * 100}%`);
	});

	it('slingshots to a new Pokémon’s value: a small pull back, a bit past it, then it settles, never leaving the track', async () => {
		mount(0, 'a');
		await settle(20);
		act(() => root.render(bar(126, 'b')));
		const positions: number[] = [];
		for (let i = 0; i < 26; i++) {
			await settle(30);
			positions.push(parseFloat(thumb().style.left));
		}
		expect(Math.min(...positions)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...positions)).toBeLessThanOrEqual(100);
		// It overshoots its value (50%) a little, and it is not a straight glide.
		expect(Math.max(...positions)).toBeGreaterThan(50.5);
		expect(positions[positions.length - 1]).toBe(50);
	});

	it('slingshots to a new Pokémon’s value with fancy animations off too', async () => {
		useStore.setState({ fancyMotion: false });
		mount(0, 'a');
		await settle(20);
		act(() => root.render(bar(126, 'b')));
		const positions: number[] = [];
		for (let i = 0; i < 26; i++) {
			await settle(30);
			positions.push(parseFloat(thumb().style.left));
		}
		expect(Math.max(...positions)).toBeGreaterThan(50.5);
		expect(Math.max(...positions)).toBeLessThanOrEqual(100);
		expect(positions[positions.length - 1]).toBe(50);
	});

	it('neither stretches nor springs with fancy animations off', () => {
		useStore.setState({ fancyMotion: false });
		mount();
		overdrag();
		expect(handle().style.transform).toBe('translateX(0px)');
		expect(tail().style.width).toBe('0px');
		pointer('pointerup', 160);
		expect(handle().style.transition).not.toContain('1.7');
		expect(tail().style.transition).not.toContain('1.7');
	});

	it('keeps the handle on the track, however far the value is pushed', async () => {
		mount(400, 'a');
		await settle(20);
		expect(thumb().style.left).toBe('100%');
		act(() => root.render(bar(-20, 'a')));
		await settle(400);
		expect(thumb().style.left).toBe('0%');
	});
});
