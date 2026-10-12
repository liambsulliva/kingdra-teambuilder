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

const mount = () => act(() => root.render(<ElasticSlider label='Speed EVs' value={252} max={252} step={4} onChange={() => {}} />));
const slider = () => container.querySelector<HTMLElement>('[role="slider"]')!;
const [, fill, thumb] = [0, 1, 2].map((i) => () => slider().children[i] as HTMLElement);
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
		expect(thumb().style.left).toMatch(/\+ [1-5]\.\d+px\)$/);
		pointer('pointerup', 160);
		expect(thumb().style.left).toBe('calc(100% - 7px + 0px)');
		expect(fill().style.transition).toContain('cubic-bezier(0.34, 2.1, 0.5, 1)');
	});

	it('neither stretches nor overshoots with fancy animations off', () => {
		useStore.setState({ fancyMotion: false });
		mount();
		overdrag();
		expect(thumb().style.left).toBe('calc(100% - 7px + 0px)');
		expect(fill().style.width).toBe('calc(100% + 0px)');
		pointer('pointerup', 160);
		expect(fill().style.transition).not.toContain('2.1');
		expect(thumb().style.transition).not.toContain('2.1');
	});
});
