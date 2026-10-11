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
	// Card view (user choice): the card falls with gravity and shatters on the Suggestions panel's top edge.
	hopMs: 320,
	hopStaggerMs: 30,
	gravity: 3200,
	maxFallMs: 650,
	fallSpinDeg: 8,
	shardMs: 650,
	popOutMs: 380,
	cardPopMs: 240,
};

let generation = 0;
const live = new Set<Animation>();
/** Elements hidden while a Pokémon walks toward them, so a stale run can be cleared. */
const hidden = new Set<HTMLElement>();

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fully inside the window and inside every scrolling ancestor's visible box.
 * A card half scrolled under the team list counts as off screen.
 */
function onScreen(el: Element | null): el is HTMLElement {
	if (!el) return false;
	const r = el.getBoundingClientRect();
	if (r.width === 0 || r.height === 0 || r.left < 0 || r.top < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight) return false;
	for (let p = el.parentElement; p; p = p.parentElement) {
		const style = getComputedStyle(p);
		if (!/(auto|scroll|hidden|clip)/.test(style.overflowX + style.overflowY)) continue;
		const c = p.getBoundingClientRect();
		if (r.left < c.left || r.top < c.top || r.right > c.right || r.bottom > c.bottom) return false;
	}
	return true;
}

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

/** A Pokémon jumps from one box to another along an arc and lands with a squash. */
function hop(species: string, from: DOMRect, to: DOMRect, delay: number, duration: number, lift: number) {
	const { outer, inner } = cloneIcon(species, from);
	// A quadratic Bézier walked at an even pace is a parabola: the jump falls like a thrown ball.
	const path = arc([from.left, from.top], [to.left, to.top], lift, 12);
	const a = outer.animate(
		path.map(([x, y], i) => ({ offset: i / (path.length - 1), transform: `translate(${x - from.left}px, ${y - from.top}px)` })),
		{ duration, delay, easing: 'linear', fill: 'both' }
	);
	const b = inner.animate(
		[{ transform: 'scale(1, 1)' }, { offset: 0.84, transform: 'scale(1, 1)' }, { offset: 0.92, transform: 'scale(1.12, 0.84)' }, { transform: 'scale(1, 1)' }],
		{ duration, delay, fill: 'both' }
	);
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

/** The card's angle on its hinge right now, mid-swing included. */
function hingeAngle(el: HTMLElement) {
	const t = getComputedStyle(el).transform;
	if (!t || t === 'none' || typeof DOMMatrix === 'undefined') return 0;
	const m = new DOMMatrix(t);
	return (Math.atan2(m.b, m.a) * 180) / Math.PI;
}

/** A stand-in for a team card: same look, no ids, labels or drop targets, fixed over the page. */
function ghostCard(tile: HTMLElement, box: DOMRect, deg: number) {
	const ghost = tile.cloneNode(true) as HTMLElement;
	for (const el of [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]) {
		for (const attr of ['data-team-card', 'data-team-tile', 'data-team-icon', 'aria-label', 'role', 'tabindex', 'id']) el.removeAttribute(attr);
	}
	ghost.classList.remove('hinge');
	ghost.setAttribute('aria-hidden', 'true');
	Object.assign(ghost.style, {
		position: 'fixed',
		left: `${box.left}px`,
		top: `${box.top}px`,
		width: `${box.width}px`,
		height: `${box.height}px`,
		margin: '0',
		zIndex: '80',
		pointerEvents: 'none',
		transformOrigin: '0 0',
		transform: `rotate(${deg}deg)`,
		boxShadow: '0 6px 12px -4px rgb(0 0 0 / 0.08)',
	});
	document.body.appendChild(ghost);
	return ghost;
}

/** Where a falling card lands: the top edge of the Suggestions panel, or the bottom of the window without one. */
function floorY() {
	const panel = document.querySelector('section[aria-label="Suggestions"]');
	const top = panel?.getBoundingClientRect().top;
	return top && top > 0 ? Math.min(top, window.innerHeight) : window.innerHeight;
}

/** The card lets go of its corner and falls with gravity until its bottom edge meets the floor. */
async function fall(ghost: HTMLElement, box: DOMRect, deg: number) {
	const drop = Math.max(0, floorY() - box.bottom);
	const duration = Math.min(MOTION.maxFallMs, Math.max(120, Math.sqrt((2 * drop) / MOTION.gravity) * 1000));
	const steps = 12;
	// Evenly spaced in time, so y grows with the square of the step: d = ½gt².
	const frames = Array.from({ length: steps + 1 }, (_, i) => {
		const f = i / steps;
		return { offset: f, transform: `translateY(${drop * f * f}px) rotate(${deg + MOTION.fallSpinDeg * f}deg)` };
	});
	const a = ghost.animate(frames, { duration, easing: 'linear', fill: 'both' });
	live.add(a);
	await a.finished.catch(() => undefined);
	live.delete(a);
	ghost.remove();
	return { impact: new DOMRect(box.left, box.top + drop, box.width, box.height), deg: deg + MOTION.fallSpinDeg };
}

/** Six pieces that tile the card: a fan around a point just below its middle. */
const SHARDS: [number, number][][] = [
	[[48, 58], [0, 0], [60, 0]],
	[[48, 58], [60, 0], [100, 0], [100, 40]],
	[[48, 58], [100, 40], [100, 100], [70, 100]],
	[[48, 58], [70, 100], [30, 100]],
	[[48, 58], [30, 100], [0, 100], [0, 65]],
	[[48, 58], [0, 65], [0, 0]],
];

interface CardLook {
	background: string;
	border: string;
	radius: string;
}

/** What a card's shards are made of: its fill, edge and corners. */
function lookOf(el: HTMLElement): CardLook {
	const style = getComputedStyle(el);
	return { background: style.backgroundColor, border: `${style.borderTopWidth} solid ${style.borderTopColor}`, radius: style.borderTopLeftRadius };
}

/** The card breaks into shards that bounce once off the Suggestions panel and drop out of the window. */
function shatter(look: CardLook, at: DOMRect, deg: number) {
	const wrap = document.createElement('div');
	wrap.setAttribute('aria-hidden', 'true');
	Object.assign(wrap.style, {
		position: 'fixed',
		left: `${at.left}px`,
		top: `${at.top}px`,
		width: `${at.width}px`,
		height: `${at.height}px`,
		zIndex: '80',
		pointerEvents: 'none',
		transformOrigin: '0 0',
		transform: `rotate(${deg}deg)`,
	});
	document.body.appendChild(wrap);
	const g = MOTION.gravity / 1e6; // px per ms²
	const runs = SHARDS.map((poly, i) => {
		const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
		const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
		const shard = document.createElement('div');
		Object.assign(shard.style, {
			position: 'absolute',
			inset: '0',
			background: look.background,
			border: look.border,
			borderRadius: look.radius,
			clipPath: `polygon(${poly.map(([x, y]) => `${x}% ${y}%`).join(', ')})`,
			transformOrigin: `${cx}% ${cy}%`,
		});
		wrap.appendChild(shard);
		// Outward from the break, up off the floor, then gravity pulls each one out of the window.
		const vx = ((cx - 48) / 50) * 0.35 + (i % 2 ? 0.05 : -0.05);
		const vy = -(0.22 + ((i * 37) % 5) * 0.035);
		const spin = (i % 2 ? 1 : -1) * (120 + i * 25);
		const steps = 10;
		const frames = Array.from({ length: steps + 1 }, (_, k) => {
			const t = (MOTION.shardMs * k) / steps;
			const f = k / steps;
			return {
				offset: f,
				transform: `translate(${vx * t}px, ${vy * t + 0.5 * g * t * t}px) rotate(${spin * f}deg)`,
				opacity: f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4,
			};
		});
		const a = shard.animate(frames, { duration: MOTION.shardMs, easing: 'linear', fill: 'both' });
		live.add(a);
		return a.finished.catch(() => undefined).finally(() => live.delete(a));
	});
	return Promise.all(runs).finally(() => wrap.remove());
}

/** The open team's card pops back into the grid, empty, as the old one breaks. */
function popCard(el: HTMLElement) {
	show([el]);
	if (reduced()) return;
	el.animate(
		[
			{ transform: 'scale(0.9)', opacity: 0 },
			{ transform: 'scale(1.04)', opacity: 1, offset: 0.6 },
			{ transform: 'scale(1)', opacity: 1 },
		],
		{ duration: MOTION.cardPopMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
	);
}

/**
 * Switch teams. The middle panel changes at once; the walk runs over it. The
 * open party walks home into its card while the new team walks off its card
 * and drops into the party, Pokémon hidden until they land. Rapid clicks
 * cancel in-flight animations and jump straight to the latest team. `select`
 * puts that member on the card in the same commit, so it never walks.
 * When the team's card is not fully on screen there is nothing to walk over:
 * the new party pops in all at once, as if each member had been added by hand.
 *
 * In card view the old party jumps home into its card's empty slots instead of
 * walking while the new card falls, shatters on the Suggestions panel, and
 * its Pokémon jump out of the break into the party while an empty card pops
 * into its place.
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
	// In card view the tile swings on its hinge, so measure the grid cell it sits in.
	const tile = document.querySelector<HTMLElement>(`[data-team-tile="${id}"]`);
	if (!onScreen(tile?.parentElement ?? document.querySelector(`[data-team-card="${id}"]`))) {
		flushSync(() => {
			useStore.getState().openTeam(id);
			if (select) useStore.getState().selectMember(select);
		});
		document.querySelectorAll<HTMLElement>('[data-party-member]').forEach((el) => pop(el));
		return;
	}
	// Any click or keypress mid-flight skips straight to the end, later phases included.
	let skipped = false;
	const skip = () => {
		skipped = true;
		live.forEach((a) => a.finish());
	};
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
			.filter(onScreen)
			.map((el) => ({ species: el.dataset.species!, index: Number(el.dataset.index), from: el.getBoundingClientRect() }));
		const sources = [...document.querySelectorAll<HTMLElement>(`[data-team-icon^="${id}:"]`)].map((el) => ({
			index: Number(el.dataset.teamIcon!.split(':')[1]),
			rect: el.getBoundingClientRect(),
			ok: onScreen(el),
		}));
		// Card view: a copy of the card as it hangs now stands in for it until it falls, since the switch empties the real one.
		const cell = tile?.parentElement?.getBoundingClientRect();
		const card = tile && cell ? (() => {
			const box = new DOMRect(cell.left, cell.top, tile.offsetWidth || cell.width, tile.offsetHeight || cell.height);
			const deg = hingeAngle(tile);
			const ghost = ghostCard(tile, box, deg);
			return { ghost, box, deg, look: lookOf(ghost) };
		})() : null;

		// The switch commits synchronously so the new party is in place before anything is painted.
		flushSync(() => {
			useStore.getState().openTeam(id);
			if (select) useStore.getState().selectMember(select);
		});

		// A member flies only when both its card icon and its party slot are on screen; the rest pop.
		const arrivals = [...document.querySelectorAll<HTMLElement>('[data-party-member]')].flatMap((el) => {
			const index = Number(el.dataset.index);
			const src = sources.find((s) => s.index === index);
			return src?.ok && onScreen(el) ? [{ el, species: el.dataset.species!, from: src.rect, to: el.getBoundingClientRect(), index }] : [];
		});
		const flying = new Set(arrivals.map((a) => a.el));
		document.querySelectorAll<HTMLElement>('[data-party-member]').forEach((el) => !flying.has(el) && pop(el));
		hide(arrivals.map((a) => a.el));
		const homeward = leaving.flatMap((h) => {
			const target = document.querySelector<HTMLElement>(`[data-team-icon="${oldId}:${h.index}"]`);
			return target && onScreen(target) ? [{ ...h, target, to: target.getBoundingClientRect() }] : [];
		});
		hide(homeward.map((h) => h.target));

		if (card) {
			const openTile = document.querySelector<HTMLElement>(`[data-team-tile="${id}"]`);
			if (openTile) hide([openTile]);
			try {
				// 1. The old party jumps home into its card's empty slots while, 2. the new card lets go and falls
				// onto the Suggestions panel. Running both at once keeps a switch to about a second.
				const home = Promise.all(
					homeward.map((h, i) => (skipped ? Promise.resolve() : hop(h.species, h.from, h.to, i * MOTION.hopStaggerMs, MOTION.hopMs, 36)).then(() => reveal([h.target])))
				);
				const { impact, deg: landed } = skipped ? { impact: card.box, deg: card.deg } : await fall(card.ghost, card.box, card.deg);
				card.ghost.remove();
				if (mine !== generation) return;
				// 3. It shatters, an empty card pops into its place, and its team jumps out of the break into the party.
				if (openTile) popCard(openTile);
				if (skipped) {
					reveal(arrivals.map((a) => a.el));
					await home;
					return;
				}
				await Promise.all([
					home,
					shatter(card.look, impact, landed),
					...arrivals.map((a, i) => {
						const from = new DOMRect(impact.left + (a.from.left - card.box.left), impact.top + (a.from.top - card.box.top), 32, 32);
						return hop(a.species, from, a.to, i * MOTION.hopStaggerMs, MOTION.popOutMs, 56).then(() => {
							reveal([a.el]);
							pop(a.el);
						});
					}),
				]);
			} finally {
				card.ghost.remove();
			}
			return;
		}

		// The old party walks home into its card while the new team walks off its own card and drops
		// into the party, both at once, so a switch takes one trip instead of two. Each old icon comes
		// back on its card as it lands; each new one appears in the party as it lands.
		const last = arrivals.length - 1;
		await Promise.all([
			...homeward.map((h, i) =>
				fly({ species: h.species, from: h.from, to: h.to, edgeX, delay: i * MOTION.staggerMs, reverse: true }).then(() => reveal([h.target]))
			),
			...arrivals.map((a, i) =>
				fly({ species: a.species, from: a.from, to: a.to, edgeX, delay: (last - i) * MOTION.staggerMs }).then(() => {
					reveal([a.el]);
					pop(a.el);
				})
			),
		]);
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

/** The landing pop: a small spring on the element that just received a member or a value. */
export function pop(el: Element | null) {
	if (!el || reduced()) return;
	(el as HTMLElement).animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.35 }, { transform: 'scale(1)' }], {
		duration: 320,
		easing: 'cubic-bezier(0.34, 2.1, 0.5, 1)',
	});
}

/** The landing pop on whatever is at `selector`, once React has drawn it. */
export function landOn(selector: string) {
	requestAnimationFrame(() => pop(document.querySelector(selector)));
}

/**
 * Adds to the open party through `add` and lands the new member in its slot,
 * the same pop as a drop. Clicking a suggestion, Add to team and a drop all land this way.
 */
export function addAndLand(add: () => boolean) {
	const s = useStore.getState();
	const at = (s.library.teams.find((t) => t.id === s.openTeamId) ?? s.library.teams[0]).members.length;
	if (add()) landOn(`[data-party-member][data-index="${at}"]`);
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
