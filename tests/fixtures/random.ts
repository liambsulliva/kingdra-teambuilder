/**
 * Seeded randomness, so a failing stress run can be replayed exactly.
 * Set STRESS_SEED to reproduce a run; the seed in use is logged once.
 */
export const DEFAULT_SEED = 0x4b494e47; // "KING"

export function seedFromEnv(): number {
	const raw = typeof process !== 'undefined' ? process.env.STRESS_SEED : undefined;
	const n = raw ? Number(raw) : NaN;
	return Number.isFinite(n) ? n >>> 0 : DEFAULT_SEED;
}

export interface Rng {
	seed: number;
	/** Uniform float in [0, 1). */
	next(): number;
	/** Integer in [min, max]. */
	int(min: number, max: number): number;
	pick<T>(list: readonly T[]): T;
	/** Up to `n` distinct elements, in random order. */
	sample<T>(list: readonly T[], n: number): T[];
	chance(p: number): boolean;
}

/** mulberry32: tiny, fast, good enough for fixtures. */
export function rng(seed: number): Rng {
	let a = seed >>> 0;
	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
	return {
		seed,
		next,
		int,
		pick: (list) => list[Math.floor(next() * list.length)],
		sample: (list, n) => {
			const copy = [...list];
			for (let i = copy.length - 1; i > 0; i--) {
				const j = Math.floor(next() * (i + 1));
				[copy[i], copy[j]] = [copy[j], copy[i]];
			}
			return copy.slice(0, Math.max(0, n));
		},
		chance: (p) => next() < p,
	};
}
