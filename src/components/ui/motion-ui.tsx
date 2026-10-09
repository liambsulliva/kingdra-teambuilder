'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';

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

const STRETCH = 5;

/**
 * Elastic slider: dragging past either end stretches the fill up to 5 px,
 * then it springs back on release, like a rubber band.
 */
export function ElasticSlider({
	value,
	min = 0,
	max,
	step = 1,
	label,
	onChange,
}: {
	value: number;
	min?: number;
	max: number;
	step?: number;
	label: string;
	onChange: (v: number) => void;
}) {
	const track = useRef<HTMLDivElement>(null);
	const [over, setOver] = useState(0);
	const [dragging, setDragging] = useState(false);
	const pct = ((value - min) / (max - min)) * 100;

	const fromPointer = (clientX: number) => {
		const r = track.current!.getBoundingClientRect();
		const raw = (clientX - r.left) / r.width;
		const excess = raw < 0 ? raw * r.width : raw > 1 ? (raw - 1) * r.width : 0;
		// Resistance grows with distance; never stretch more than 5 px.
		setOver(Math.sign(excess) * STRETCH * (1 - Math.exp(-Math.abs(excess) / 24)));
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
				fromPointer(e.clientX);
			}}
			onPointerMove={(e) => dragging && fromPointer(e.clientX)}
			onPointerUp={() => {
				setDragging(false);
				setOver(0);
			}}
			onPointerCancel={() => {
				setDragging(false);
				setOver(0);
			}}
			onKeyDown={(e) => {
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
			<div
				className='absolute top-[7px] h-0.5 rounded-full bg-fg'
				style={{
					left: over < 0 ? over : 0,
					width: `calc(${pct}% + ${over > 0 ? over : 0}px)`,
					transition: dragging ? 'none' : 'all 420ms cubic-bezier(0.34, 2.1, 0.5, 1)',
				}}
			/>
			<div
				className='absolute top-[1px] size-3.5 rounded-full border-[1.5px] border-fg bg-bg'
				style={{
					left: `calc(${pct}% - 7px + ${over}px)`,
					transition: dragging ? 'none' : 'left 420ms cubic-bezier(0.34, 2.1, 0.5, 1)',
				}}
			/>
		</div>
	);
}
