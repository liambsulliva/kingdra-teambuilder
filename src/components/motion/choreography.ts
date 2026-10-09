'use client';

import { flushSync } from 'react-dom';
import { Dex } from '@pkmn/dex';
import { iconSprite, iconStyle } from '@/lib/sprites';
import { useStore } from '@/lib/store';
import { MOBILE_QUERY } from '@/lib/breakpoints';

// Starting values from the Motion page in Figma; tune here.
// Team switch is "brisk": about 0.7 s end to end (user choice).
export const MOTION = {
	stepMs: 55,
	rockDeg: 30,
	walkMs: 110,
	jumpMs: 160,
	landMs: 60,
	staggerMs: 20,
	liftMs: 300,
	pickMs: 320,
};

let generation = 0;
const live = new Set<Animation>();
/** Elements hidden while a Pokémon walks toward them, so a stale run can be cleared. */
const hidden = new Set<HTMLElement>();

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible = (el: Element | null): el is HTMLElement => {
	if (!el) return false;
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
};

function cloneIcon(species: string, rect: DOMRect, size = 32) {
	const s = Dex.species.get(species);
	const sprite = iconSprite({ name: s.name, num: s.num, forme: s.forme });
	const outer = document.createElement('div');
	outer.setAttribute('aria-hidden', 'true');
	Object.assign(outer.style, {
		position: 'fixed',
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${size}px`,
		height: `${size}px`,
		zIndex: '80',
		pointerEvents: 'none',
	});
	const inner = document.createElement('div');
	Object.assign(inner.style, { width: '100%', height: '100%', transformOrigin: '50% 100%' }, sprite ? iconStyle(sprite, size) : {});
	outer.appendChild(inner);
	document.body.appendChild(outer);
	return { outer, inner };
}

/** Points along a quadratic arc that peaks `lift` px above the higher end. */
function arc(from: [number, number], to: [number, number], lift: number, steps = 10) {
	const peak = Math.min(from[1], to[1]) - lift;
	const cx = (from[0] + to[0]) / 2;
	const cy = 2 * peak - (from[1] + to[1]) / 2;
	return Array.from({ length: steps + 1 }, (_, i) => {
		const t = i / steps;
		const x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * cx + t ** 2 * to[0];
		const y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * cy + t ** 2 * to[1];
		return [x, y] as [number, number];
	});
}

interface Flight {
	species: string;
	from: DOMRect;
	to: DOMRect;
	/** Walk horizontally to this x before (forward) or after (reverse) the jump. */
	edgeX: number;
	delay: number;
	reverse?: boolean;
}

function fly({ species, from, to, edgeX, delay, reverse }: Flight) {
	const { outer, inner } = cloneIcon(species, from);
	const origin: [number, number] = [from.left, from.top];
	const walkEnd: [number, number] = reverse ? [edgeX, to.top] : [edgeX, from.top];
	const jumpFrom = reverse ? origin : walkEnd;
	const jumpTo: [number, number] = reverse ? walkEnd : [to.left, to.top];
	const walkDist = Math.abs(edgeX - (reverse ? to.left : from.left));
	const walkMs = Math.max(MOTION.stepMs * 2, Math.min(MOTION.walkMs, walkDist * 1.2));
	const total = walkMs + MOTION.jumpMs + MOTION.landMs;
	const jump = arc(jumpFrom, jumpTo, 28);
	const pathFrames: Keyframe[] = [];
	const at = (ms: number) => ms / total;
	const tf = ([x, y]: [number, number]) => `translate(${x - origin[0]}px, ${y - origin[1]}px)`;
	if (!reverse) {
		pathFrames.push({ offset: 0, transform: tf(origin) }, { offset: at(walkMs), transform: tf(walkEnd) });
		jump.forEach((p, i) => i && pathFrames.push({ offset: at(walkMs + (MOTION.jumpMs * i) / (jump.length - 1)), transform: tf(p) }));
		pathFrames.push({ offset: 1, transform: tf(jumpTo) });
	} else {
		jump.forEach((p, i) => pathFrames.push({ offset: at((MOTION.jumpMs * i) / (jump.length - 1)), transform: tf(p) }));
		pathFrames.push({ offset: at(MOTION.jumpMs + walkMs), transform: tf([to.left, to.top]) }, { offset: 1, transform: tf([to.left, to.top]) });
	}
	// Waddle: rock ±rockDeg about the feet on every step of the walk.
	const rock: Keyframe[] = [];
	const walkStart = reverse ? MOTION.jumpMs : 0;
	const steps = Math.max(2, Math.round(walkMs / MOTION.stepMs));
	rock.push({ offset: 0, transform: 'rotate(0deg)' });
	for (let i = 0; i <= steps; i++) {
		const deg = i === steps ? 0 : (i % 2 ? 1 : -1) * MOTION.rockDeg;
		rock.push({ offset: at(walkStart + (walkMs * i) / steps), transform: `translateY(${i % 2 ? -2 : 0}px) rotate(${deg}deg)` });
	}
	if (!reverse) rock.push({ offset: at(walkMs + MOTION.jumpMs), transform: 'rotate(0deg)' });
	const land = at(total - MOTION.landMs * 0.5);
	rock.push({ offset: Math.max(land, rock[rock.length - 1].offset as number), transform: 'scale(1.12, 0.84)' }, { offset: 1, transform: 'scale(1, 1)' });
	const a = outer.animate(pathFrames, { duration: total, delay, easing: 'linear', fill: 'both' });
	const b = inner.animate(rock.sort((x, y) => (x.offset as number) - (y.offset as number)), { duration: total, delay, easing: 'linear', fill: 'both' });
	live.add(a);
	live.add(b);
	return a.finished
		.catch(() => undefined)
		.finally(() => {
			live.delete(a);
			live.delete(b);
			outer.remove();
		});
}

const hide = (els: HTMLElement[]) =>
	els.forEach((el) => {
		el.style.opacity = '0';
		hidden.add(el);
	});
const show = (els: HTMLElement[]) =>
	els.forEach((el) => {
		el.style.opacity = '';
		hidden.delete(el);
	});
const showAllHidden = () => show([...hidden]);

/**
 * Switch teams. The middle panel changes at once; the walk runs over it. The
 * open party walks home into its card, then the new team walks off its card
 * and drops into the party, Pokémon hidden until they land. Rapid clicks
 * cancel in-flight animations and jump straight to the latest team. `select`
 * puts that member on the card in the same commit, so it never walks.
 */
export async function openTeamWithMotion(id: string, select?: string) {
	const store = useStore.getState();
	if (store.openTeamId === id) return;
	const mine = ++generation;
	live.forEach((a) => a.finish());
	showAllHidden();
	if (reduced() || window.matchMedia(MOBILE_QUERY).matches) {
		store.openTeam(id);
		if (select) useStore.getState().selectMember(select);
		return;
	}
	// Any click or keypress mid-flight skips straight to the end.
	const skip = () => live.forEach((a) => a.finish());
	window.addEventListener('pointerdown', skip, { once: true, capture: true });
	window.addEventListener('keydown', skip, { once: true, capture: true });
	const panel = document.querySelector('[data-team-panel]')?.getBoundingClientRect();
	const edgeX = panel ? panel.right - 40 : 260;
	// Only the latest switch may reveal anything; an older run's arrivals stay hidden.
	const reveal = (els: HTMLElement[]) => mine === generation && show(els);

	try {
		const oldId = store.openTeamId;
		// Measure before the switch moves anything: the old party, and the new team's icons on its card.
		const leaving = [...document.querySelectorAll<HTMLElement>('[data-party-member]')]
			.filter(visible)
			.map((el) => ({ species: el.dataset.species!, index: Number(el.dataset.index), from: el.getBoundingClientRect() }));
		const sources = [...document.querySelectorAll<HTMLElement>(`[data-team-icon^="${id}:"]`)].map((el) => ({
			index: Number(el.dataset.teamIcon!.split(':')[1]),
			rect: el.getBoundingClientRect(),
			ok: visible(el),
		}));

		// The switch commits synchronously so the new party is in place before anything is painted.
		flushSync(() => {
			useStore.getState().openTeam(id);
			if (select) useStore.getState().selectMember(select);
		});

		const arrivals = [...document.querySelectorAll<HTMLElement>('[data-party-member]')].flatMap((el) => {
			const index = Number(el.dataset.index);
			const src = sources.find((s) => s.index === index);
			return src?.ok ? [{ el, species: el.dataset.species!, from: src.rect, to: el.getBoundingClientRect(), index }] : [];
		});
		hide(arrivals.map((a) => a.el));
		const homeward = leaving.flatMap((h) => {
			const target = document.querySelector<HTMLElement>(`[data-team-icon="${oldId}:${h.index}"]`);
			return target && visible(target) ? [{ ...h, target, to: target.getBoundingClientRect() }] : [];
		});
		hide(homeward.map((h) => h.target));

		// 1. The old party walks home. Its icons come back on the card as each one lands.
		if (homeward.length) {
			await Promise.all(
				homeward.map((h, i) =>
					fly({ species: h.species, from: h.from, to: h.to, edgeX, delay: i * MOTION.staggerMs, reverse: true }).then(() => reveal([h.target]))
				)
			);
		}
		if (mine !== generation) return;

		// 2. The new team walks down into its party.
		const last = arrivals.length - 1;
		await Promise.all(
			arrivals.map((a, i) =>
				fly({ species: a.species, from: a.from, to: a.to, edgeX, delay: (last - i) * MOTION.staggerMs }).then(() => reveal([a.el]))
			)
		);
	} finally {
		window.removeEventListener('pointerdown', skip, { capture: true });
		window.removeEventListener('keydown', skip, { capture: true });
	}
}

/** A party member jumps up onto the card along an arc, growing to card size. */
export async function liftToCard(species: string, from: DOMRect, to: DOMRect) {
	if (reduced()) return;
	const { outer, inner } = cloneIcon(species, from);
	const path = arc([from.left, from.top], [to.left + to.width / 2 - 16, to.top + to.height - 32], 40, 12);
	const scale = Math.min(to.width, to.height) / 32;
	const frames = path.map(([x, y], i) => ({
		offset: i / (path.length - 1),
		transform: `translate(${x - from.left}px, ${y - from.top}px) scale(${1 + ((scale - 1) * i) / (path.length - 1)})`,
	}));
	outer.style.transformOrigin = '50% 100%';
	const a = outer.animate(frames, { duration: MOTION.liftMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
	const b = inner.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: MOTION.liftMs, fill: 'both' });
	live.add(a);
	await a.finished.catch(() => undefined);
	live.delete(a);
	b.cancel();
	outer.remove();
}

/** A small poof where a dragged member was released outside the party. */
export function poof(x: number, y: number) {
	if (reduced()) return;
	for (let i = 0; i < 6; i++) {
		const p = document.createElement('span');
		const angle = (i / 6) * Math.PI * 2;
		Object.assign(p.style, {
			position: 'fixed',
			left: `${x}px`,
			top: `${y}px`,
			width: `${8 + (i % 3) * 4}px`,
			height: `${8 + (i % 3) * 4}px`,
			borderRadius: '999px',
			border: '1px solid rgb(var(--line-strong))',
			pointerEvents: 'none',
			zIndex: '90',
			animation: 'poof 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
		});
		p.style.setProperty('--dx', `${Math.cos(angle) * 18}px`);
		p.style.setProperty('--dy', `${Math.sin(angle) * 18}px`);
		document.body.appendChild(p);
		setTimeout(() => p.remove(), 320);
	}
}

/** A small spring pop on the element that just received a value. */
export function pop(el: Element | null) {
	if (!el || reduced()) return;
	(el as HTMLElement).animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.35 }, { transform: 'scale(1)' }], {
		duration: 320,
		easing: 'cubic-bezier(0.34, 2.1, 0.5, 1)',
	});
}

/**
 * A picked value (a move name, an item…) arcs from its row in the right panel
 * into its destination on the card, then the destination pops.
 */
export async function flyValue(from: Element | null, toSelector: string, label: string, swatch?: string) {
	const to = document.querySelector(toSelector);
	if (!from || !to || reduced()) return pop(to);
	const a = from.getBoundingClientRect();
	const b = to.getBoundingClientRect();
	const chip = document.createElement('div');
	chip.setAttribute('aria-hidden', 'true');
	chip.className = 'flex items-center gap-1.5 rounded-md bg-bg px-2 py-1 text-base font-medium text-fg shadow-lg ring-1 ring-line';
	Object.assign(chip.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top + a.height / 2 - 14}px`, zIndex: '80', pointerEvents: 'none' });
	if (swatch) {
		const s = document.createElement('span');
		Object.assign(s.style, { width: '8px', height: '8px', borderRadius: '2px', background: swatch });
		chip.appendChild(s);
	}
	chip.appendChild(document.createTextNode(label));
	document.body.appendChild(chip);
	const path = arc([a.left, a.top + a.height / 2 - 14], [b.left + 10, b.top + b.height / 2 - 14], 40, 12);
	const anim = chip.animate(
		path.map(([x, y], i) => ({
			offset: i / (path.length - 1),
			transform: `translate(${x - a.left}px, ${y - (a.top + a.height / 2 - 14)}px) scale(${1 - (0.08 * i) / (path.length - 1)})`,
			opacity: i === path.length - 1 ? 0.2 : 1,
		})),
		{ duration: MOTION.pickMs, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' }
	);
	await anim.finished.catch(() => undefined);
	chip.remove();
	pop(to);
}

/**
 * Evolve: the card sprite hops, swaps species at the top of the hop
 * (crossfading mid-air), then lands with a squash. About 350 ms.
 */
export async function hopAndSwap(el: HTMLElement | null, swap: () => void) {
	if (!el || reduced()) return swap();
	el.style.transformOrigin = '50% 100%';
	const up = el.animate(
		[
			{ transform: 'translateY(0)', opacity: 1 },
			{ transform: 'translateY(-22px)', opacity: 0.2 },
		],
		{ duration: 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
	);
	await up.finished.catch(() => undefined);
	swap();
	await new Promise((r) => requestAnimationFrame(() => r(null)));
	const down = el.animate(
		[
			{ transform: 'translateY(-22px)', opacity: 0.2 },
			{ transform: 'translateY(0) scale(1.08, 0.9)', opacity: 1, offset: 0.75 },
			{ transform: 'translateY(0) scale(1, 1)', opacity: 1 },
		],
		{ duration: 200, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' }
	);
	up.cancel();
	await down.finished.catch(() => undefined);
}

/**
 * Swap in from the comparison: the old party icon poofs while the candidate
 * arcs from its carousel card into the same party slot. About 400 ms.
 */
export async function hopInto(species: string, fromSelector: string, toSelector: string) {
	const from = document.querySelector(fromSelector);
	const to = document.querySelector(toSelector);
	if (!from || !to || reduced()) return;
	const a = from.getBoundingClientRect();
	const b = to.getBoundingClientRect();
	poof(b.left + b.width / 2, b.top + b.height / 2);
	const start = new DOMRect(a.left + a.width / 2 - 16, a.top + 12, 32, 32);
	const { outer } = cloneIcon(species, start);
	const path = arc([start.left, start.top], [b.left, b.top], 36, 12);
	const anim = outer.animate(
		path.map(([x, y], i) => ({ offset: i / (path.length - 1), transform: `translate(${x - start.left}px, ${y - start.top}px)` })),
		{ duration: 400, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' }
	);
	(to as HTMLElement).style.opacity = '0';
	await anim.finished.catch(() => undefined);
	outer.remove();
	(to as HTMLElement).style.opacity = '';
	pop(to);
}
