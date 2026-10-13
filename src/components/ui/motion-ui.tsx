'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useStore } from '@/lib/store';

/** A number that counts to its new value over 300 ms. */
export function TickNumber({ value, className = '' }: { value: number; className?: string }) {
	const [shown, setShown] = useState(value);
	const from = useRef(value);
	useEffect(() => {
		const controls = animate(from.current, value, {
			duration: 0.3,
			ease: [0.22, 1, 0.36, 1],
			onUpdate: (v) => {
				from.current = v;
				setShown(Math.round(v));
			},
		});
		return () => controls.stop();
	}, [value]);
	return <span className={`tabular-nums ${className}`}>{shown}</span>;
}

const STRETCH = 4;
const SPRING = '420ms cubic-bezier(0.34, 1.7, 0.5, 1)';
/** With fancy animations off: the same glide, without the overshoot. */
const GLIDE = '200ms cubic-bezier(0.22, 1, 0.36, 1)';

/** A bar's position on the track, in percent, held inside the track whatever the animation does. */
const clampPct = (p: number) => Math.min(100, Math.max(0, p));

/**
 * Elastic slider: dragging past either end stretches the bar up to 4 px, then it springs back on release, like a
 * rubber band. The handle stays on the track. A new Pokémon's value (`identity` changes) slingshots to its place;
 * any other change glides without overshoot. With fancy animations off nothing stretches.
 */
export function ElasticSlider({
	value,
	min = 0,
	max,
	step = 1,
	label,
	identity,
	onChange,
}: {
	value: number;
	min?: number;
	max: number;
	step?: number;
	label: string;
	/** Changes when the bar shows a different Pokémon. */
	identity?: string;
	onChange: (v: number) => void;
}) {
	const track = useRef<HTMLDivElement>(null);
	const [over, setOver] = useState(0);
	const [dragging, setDragging] = useState(false);
	// Set by the release of a drag, until the bar has sprung back.
	const [releasing, setReleasing] = useState(false);
	const elastic = useStore((s) => s.fancyMotion);
	const pct = clampPct(((value - min) / (max - min)) * 100);
	// Where the bar is, in percent. It may run past the target while it settles; the display never leaves the track.
	const position = useMotionValue(pct);
	const shown = useTransform(position, (p) => `${clampPct(p)}%`);
	const shownId = useRef(identity);
	useEffect(() => {
		const switched = shownId.current !== identity;
		shownId.current = identity;
		if (dragging) {
			position.set(pct);
			return;
		}
		if (position.get() === pct) return;
		// A switch slingshots: the bar is pulled back a little, launched past its value, then settles on it.
		const from = position.get();
		const toward = Math.sign(pct - from);
		const distance = Math.abs(pct - from);
		const pull = Math.min(3, distance * 0.15);
		const past = Math.min(4, 1 + distance * 0.08);
		const controls = switched
			? animate(position, [from, from - toward * pull, pct + toward * past, pct], {
					duration: 0.5,
					times: [0, 0.2, 0.72, 1],
					ease: ['easeIn', 'circOut', 'easeInOut'],
				})
			: animate(position, pct, { duration: 0.2, ease: [0.22, 1, 0.36, 1] });
		return () => controls.stop();
	}, [pct, identity, dragging, position]);
	// Only the stretch springs back, and only after a drag; everything else glides.
	const stretchEase = elastic && (over !== 0 || releasing) ? SPRING : GLIDE;
	const tail = over > 0 ? over : 0;
	const head = over < 0 ? -over : 0;

	const fromPointer = (clientX: number) => {
		const r = track.current!.getBoundingClientRect();
		const raw = (clientX - r.left) / r.width;
		const excess = raw < 0 ? raw * r.width : raw > 1 ? (raw - 1) * r.width : 0;
		// Resistance grows with distance; never stretch more than 4 px.
		setOver(elastic ? Math.sign(excess) * STRETCH * (1 - Math.exp(-Math.abs(excess) / 24)) : 0);
		const v = Math.round((min + Math.min(1, Math.max(0, raw)) * (max - min)) / step) * step;
		if (v !== value) onChange(v);
	};

	return (
		<div
			role='slider'
			tabIndex={0}
			aria-label={label}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
			className='relative h-4 min-w-0 flex-1 cursor-pointer touch-none select-none'
			onPointerDown={(e) => {
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
				setDragging(true);
				setReleasing(false);
				fromPointer(e.clientX);
			}}
			onPointerMove={(e) => dragging && fromPointer(e.clientX)}
			onPointerUp={() => {
				setReleasing(over !== 0);
				setDragging(false);
				setOver(0);
			}}
			onPointerCancel={() => {
				setReleasing(over !== 0);
				setDragging(false);
				setOver(0);
			}}
			onKeyDown={(e) => {
				setReleasing(false);
				const big = e.shiftKey ? step * 8 : step;
				if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + big));
				else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, value - big));
				else if (e.key === 'Home') onChange(min);
				else if (e.key === 'End') onChange(max);
				else return;
				e.preventDefault();
			}}
		>
			<div ref={track} className='absolute inset-x-0 top-[7px] h-0.5 rounded-full bg-line' />
			<motion.div className='absolute left-0 top-[7px] h-0.5 rounded-full bg-fg' style={{ width: shown }}>
				<div
					className='absolute left-full top-0 h-full rounded-r-full bg-fg'
					style={{ width: `${tail}px`, transition: dragging ? 'none' : `width ${stretchEase}` }}
				/>
				<div
					className='absolute right-full top-0 h-full rounded-l-full bg-fg'
					style={{ width: `${head}px`, transition: dragging ? 'none' : `width ${stretchEase}` }}
				/>
			</motion.div>
			<motion.div className='absolute top-0 h-0' style={{ left: shown }}>
				<div
					className='absolute top-[1px] size-3.5 rounded-full border-[1.5px] border-fg bg-bg'
					style={{
						left: '-7px',
						transform: `translateX(${over}px)`,
						transition: dragging ? 'none' : `transform ${stretchEase}`,
					}}
					onTransitionEnd={() => setReleasing(false)}
				/>
			</motion.div>
		</div>
	);
}
