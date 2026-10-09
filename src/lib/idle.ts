/** Run `fn` when the browser is idle (or within `timeout` ms). Returns a cancel function. */
export function whenIdle(fn: () => void, timeout = 200): () => void {
	if (typeof requestIdleCallback === 'function') {
		const id = requestIdleCallback(fn, { timeout });
		return () => cancelIdleCallback(id);
	}
	const id = setTimeout(fn, 16);
	return () => clearTimeout(id);
}
