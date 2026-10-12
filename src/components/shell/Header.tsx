'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ClerkFailed, Show, SignInButton, UserButton } from '@clerk/nextjs';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { useStore, type SaveStatus } from '@/lib/store';
import { useReducedMotion } from '@/lib/hooks';

export function Logo({ size = 38 }: { size?: number }) {
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src='/brand/kingdra@2x.png'
			alt=''
			width={size}
			height={size}
			className='pixelated shrink-0'
			draggable={false}
		/>
	);
}

/** The save swim: six still frames, 400 ms each, with nothing drawn in between (stop motion, not a tween). */
const FRAME_MS = 400;
const FRAMES = 6;
/** Kingdra is drawn at 18 × 20, three fifths of its 30 × 34 icon, so the swim and its label sit comfortably in the header. */
const STEP = 6;
const START = 6;
const BOB = [0, -1, 0, 1, 0, -1];
const TILT = [-6, 0, 6, 0, -6, 0];
/** Each frame's bubble starts at its own height, so the trail is uneven. Bubbles start at 3 px and grow a pixel a frame. */
const BUBBLE_Y = [13, 9, 15, 11, 14, 8];
const BUBBLE_SIZE = 3;
const BUBBLE_RISE = 3;

/** A save that lands at once (a guest save) still shows two frames, so it never just flickers. */
const MIN_MS = 2 * FRAME_MS;

/**
 * The frame Kingdra is on, or null when it isn't swimming. Every save starts or extends the swim: an account
 * save while it is in flight, a guest save once it is written to this browser. It stops at the next frame
 * once nothing is saving and the last save has shown for two frames, even mid-lap. An error stops it at
 * once. With reduced motion it never swims.
 */
function useSaveSwim(save: SaveStatus, localWrites: number) {
	const reduced = useReducedMotion();
	const [frame, setFrame] = useState<number | null>(null);
	const current = useRef(frame);
	useEffect(() => {
		current.current = frame;
	}, [frame]);
	/** When the latest save has had its two frames. */
	const until = useRef(0);
	const start = () => {
		until.current = performance.now() + MIN_MS;
		if (current.current === null) setFrame(0);
	};
	useEffect(() => {
		if (save === 'error') setFrame(null);
		else if (save === 'saving' && !reduced) start();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [save]);
	useEffect(() => {
		if (localWrites && !reduced) start();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localWrites]);
	useEffect(() => {
		if (frame === null) return;
		const t = setTimeout(() => {
			// A millisecond of slack: a timer can fire a hair before the moment it was set for.
			const busy = useStore.getState().save === 'saving' || performance.now() < until.current - 1;
			setFrame(busy ? (frame + 1) % FRAMES : null);
		}, FRAME_MS);
		return () => clearTimeout(t);
	}, [frame]);
	return reduced ? null : frame;
}

/**
 * Kingdra swims right across a 54 px track, 6 px a frame, tilting and bobbing. Each frame leaves a bubble
 * whose right edge is 2 px behind Kingdra, at its own height, that rises 3 px a frame, grows and
 * fades, and pops after its third frame. Bubbles are only ever behind it: they are drawn under it, and a new
 * lap starts with no trail, so none is left ahead.
 */
function KingdraSwim({ frame }: { frame: number }) {
	const bubbles = Array.from({ length: Math.min(3, frame + 1) }, (_, age) => frame - age);
	return (
		<span aria-hidden='true' data-save-swim={frame} className='relative block h-[22px] w-[54px] shrink-0'>
			{bubbles.map((spawn) => {
				const age = frame - spawn;
				const size = BUBBLE_SIZE + age;
				// Centered where it spawned, so it rises straight up as it grows.
				const x = START + STEP * spawn - 2 - BUBBLE_SIZE / 2;
				const y = BUBBLE_Y[spawn] - BUBBLE_RISE * age;
				return (
					<span
						key={spawn}
						data-bubble={spawn}
						className='absolute rounded-full border border-current'
						style={{ width: size, height: size, left: x - size / 2, top: y - size / 2, opacity: age === 2 ? 0.6 : 1 }}
					/>
				);
			})}
			<span
				data-kingdra
				className='kingdra-silhouette absolute left-0 top-px h-[20px] w-[18px] bg-current'
				style={{ transform: `translate(${START + STEP * frame}px, ${BOB[frame]}px) rotate(${TILT[frame]}deg)` }}
			/>
		</span>
	);
}

function SaveStatus() {
	const save = useStore((s) => s.save);
	const localWrites = useStore((s) => s.localWrites);
	const frame = useSaveSwim(save, localWrites);
	const label = { local: 'Saved in this browser', saving: 'Saving', saved: 'Saved', error: 'Not saved' }[save];
	// While Kingdra swims it is the whole indicator; screen readers still hear "Saving".
	return (
		<span className={`hidden items-center gap-1.5 pr-2 text-xs md:inline-flex ${save === 'error' ? 'text-danger' : 'text-muted'}`} aria-live='polite'>
			{frame !== null ? (
				<>
					<KingdraSwim frame={frame} />
					<span className='sr-only'>Saving</span>
				</>
			) : (
				<>
					<Icon name={save === 'error' ? 'warning' : 'saved'} />
					{label}
				</>
			)}
		</span>
	);
}

export function useTheme() {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	useEffect(() => {
		const saved = document.documentElement.dataset.theme;
		setTheme(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
	}, []);
	const toggle = () => {
		const next = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('kingdra.theme', next);
		} catch {}
		setTheme(next);
	};
	return { theme, toggle };
}

/** Card art style: Black/White animated sprites or X/Y pixelated 3D models. Saved per viewer. */
export function SpriteToggle() {
	const value = useStore((s) => s.spriteSet);
	const setValue = useStore((s) => s.setSpriteSet);
	return (
		<div role='radiogroup' aria-label='Card sprites' className='mr-1 inline-flex gap-0.5 rounded-md border border-line p-0.5'>
			{(['bw', 'xy'] as const).map((v) => (
				<button
					key={v}
					type='button'
					role='radio'
					aria-checked={value === v}
					title={v === 'bw' ? 'Black/White animated sprites' : 'X/Y pixelated 3D sprites'}
					onClick={() => setValue(v)}
					className={`squishy rounded px-1.5 py-0.5 text-xs font-medium ${value === v ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg'}`}
				>
					{v === 'bw' ? 'B/W' : 'X/Y'}
				</button>
			))}
		</div>
	);
}

/** Turns off the walk, the card fall and the lift onto the card; a switch then pops the new party in. Saved per viewer. */
export function MotionToggle({ tooltip }: { tooltip?: 'below' | 'none' }) {
	const fancy = useStore((s) => s.fancyMotion);
	const setFancy = useStore((s) => s.setFancyMotion);
	return <IconButton icon='shiny' label='Disable fancy animations' selected={!fancy} onClick={() => setFancy(!fancy)} tooltip={tooltip} />;
}

export function Account() {
	return (
		<>
			{/* Clerk renders nothing until it loads. If it can't (a live key on a host its instance refuses), say so
			    instead of leaving the corner empty. */}
			<ClerkFailed>
				<IconButton icon='account' label="Sign-in isn't available on this deployment" tooltipAlign='end' disabled />
			</ClerkFailed>
			<Show when='signed-out'>
				<SignInButton mode='modal'>
					<IconButton icon='account' label='Sign in to sync your teams' tooltipAlign='end' />
				</SignInButton>
			</Show>
			<Show when='signed-in'>
				<span className='inline-flex size-8 items-center justify-center'>
					<UserButton appearance={{ elements: { avatarBox: { width: 20, height: 20 } } }} />
				</span>
			</Show>
		</>
	);
}

export function Header() {
	const { theme, toggle } = useTheme();
	return (
		<header className='flex h-14 shrink-0 items-center gap-1 border-b border-line pl-6 pr-4'>
			<Link href='/' className='flex items-center gap-2' aria-label='Kingdra home'>
				<Logo />
				<span className='font-head text-[20px] font-bold leading-6 tracking-[-0.01em]'>Kingdra</span>
			</Link>
			<span className='flex-1' />
			<SaveStatus />
			<SpriteToggle />
			<MotionToggle />
			<IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle} />
			<Account />
		</header>
	);
}
