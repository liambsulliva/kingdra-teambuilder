'use client';

import { useEffect, useLayoutEffect, useReducer, useRef, useState, type RefObject } from 'react';

/**
 * A loading placeholder: a faint gradient that pulses until the image on top
 * of it has loaded. Light and dark come from the skeleton tokens in globals.css.
 * The parent must be `relative` and sized.
 */
export function Skeleton({ className = '' }: { className?: string }) {
	return <span aria-hidden className={`absolute inset-0 animate-pulse bg-gradient-to-r from-skeleton-edge via-skeleton-mid to-skeleton-edge ${className}`} />;
}

/**
 * A lazy <img> that shows a Skeleton until it has loaded, then fades in over
 * 300 ms. An image the browser already has is shown at once, with no skeleton.
 */
export function LazyImg({
	src,
	alt,
	size,
	className = '',
	onError,
}: {
	src: string;
	alt: string;
	size: number;
	className?: string;
	onError?: () => void;
}) {
	const ref = useRef<HTMLImageElement>(null);
	// Keyed on the source: a new URL starts over with its own skeleton.
	const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
	const loaded = loadedSrc === src;
	// A cached image can finish before React attaches onLoad, so check it once on mount.
	useLayoutEffect(() => {
		if (ref.current?.complete && ref.current.naturalWidth > 0) setLoadedSrc(src);
	}, [src]);
	return (
		<span className={`relative block shrink-0 overflow-hidden rounded-md ${className}`} style={{ width: size, height: size }}>
			{!loaded && <Skeleton />}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				ref={ref}
				src={src}
				alt={alt}
				loading='lazy'
				decoding='async'
				draggable={false}
				onLoad={() => setLoadedSrc(src)}
				onError={onError}
				className={`pixelated absolute inset-0 h-full w-full object-contain object-bottom transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
			/>
		</span>
	);
}

/** Background images (the icon sheets) that have finished loading this session, by URL. */
const sheets = new Map<string, 'ready' | 'failed'>();

/**
 * How a background image is doing: 'loading' until it has decoded, then 'ready'
 * or 'failed'. The first use of a URL preloads it; later uses read the answer.
 */
export function useSheet(src: string | null): 'loading' | 'ready' | 'failed' {
	const [, rerender] = useReducer((n: number) => n + 1, 0);
	useEffect(() => {
		if (!src || sheets.has(src)) return;
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => {
			sheets.set(src, 'ready');
			rerender();
		};
		img.onerror = () => {
			sheets.set(src, 'failed');
			rerender();
		};
		img.src = src;
		return () => {
			img.onload = null;
			img.onerror = null;
		};
	}, [src]);
	return (src && sheets.get(src)) || 'loading';
}

/** True once the element is within 200 px of the viewport, and stays true: lazy loading for CSS backgrounds. */
export function useNearViewport(ref: RefObject<Element | null>) {
	const [near, setNear] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (near || !el) return;
		// Without observers (old browsers) there is nothing to wait for.
		if (typeof IntersectionObserver === 'undefined') {
			setNear(true);
			return;
		}
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setNear(true);
					io.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		io.observe(el);
		return () => io.disconnect();
	}, [ref, near]);
	return near;
}
