'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { useStore } from '@/lib/store';

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

function SaveStatus() {
	const save = useStore((s) => s.save);
	const label = { local: 'Saved in this browser', saving: 'Saving', saved: 'Saved', error: 'Not saved, retrying' }[save];
	return (
		<span className={`hidden items-center gap-1.5 pr-2 text-xs md:inline-flex ${save === 'error' ? 'text-danger' : 'text-muted'}`} aria-live='polite'>
			<Icon name={save === 'error' ? 'warning' : 'saved'} />
			{label}
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

export function Account() {
	return (
		<>
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
			<IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle} />
			<Account />
		</header>
	);
}
