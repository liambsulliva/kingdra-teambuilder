'use client';

import { useEffect, useState } from 'react';
import { OpenTeamValidation, Persistence, useIsMerged, useIsMobile } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { prefetchLearnsets } from '@/lib/dex';
import { prefetchPokeballs } from '@/lib/sprites';
import { whenIdle } from '@/lib/idle';
import { AppShell } from './AppShell';
import { Header } from './Header';
import { Dialogs, Toasts } from './Dialogs';
import { DragLayer } from './DragLayer';
import { TeamLibrary } from '@/components/library/TeamLibrary';
import { Workspace } from '@/components/workspace/Workspace';
import { Inspector } from '@/components/inspector/Inspector';
import { BottomPanel } from '@/components/browse/BottomPanel';
import { BoxDrawer } from '@/components/browse/BoxDrawer';
import { MobileApp } from '@/components/mobile/MobileApp';
import { DraftBoard } from '@/components/draft/DraftBoard';
import { DraftSyncer } from '@/lib/draft/sync';

// Performance barometers, read with performance.getEntriesByType('mark'):
// boot (this module evaluated) -> hydrated (server shell hydrated) -> ready (app and library on screen).
if (typeof window !== 'undefined') performance.mark?.('kingdra:boot');

export function App() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		performance.mark?.('kingdra:hydrated');
		setMounted(true);
	}, []);
	// Persistence mounts with the server-rendered shell, so a guest library is loaded before the first full render.
	return (
		<>
			<Persistence />
			{mounted ? <Workbench /> : <AppShell />}
		</>
	);
}

function Workbench() {
	const hydrated = useStore((s) => s.hydrated);
	const mobile = useIsMobile();
	const merged = useIsMerged();
	const setMerged = useStore((s) => s.setMerged);
	const draftMode = useStore((s) => s.draftMode);
	useEffect(() => setMerged(merged), [merged, setMerged]);
	useEffect(() => {
		if (!hydrated) return;
		performance.mark?.('kingdra:ready');
		// The first card opened needs the learnsets, and the fallback Poké Balls for both card sets are cheap: load them while nothing else is happening.
		const cancelLearnsets = whenIdle(prefetchLearnsets, 2000);
		const cancelBalls = whenIdle(prefetchPokeballs, 2000);
		return () => {
			cancelLearnsets();
			cancelBalls();
		};
	}, [hydrated]);

	return (
		<DragLayer>
			<OpenTeamValidation />
			<DraftSyncer />
			{mobile ? (
				<MobileApp />
			) : (
				<div className={`flex h-dvh flex-col transition-opacity duration-200 ${hydrated ? 'opacity-100' : 'opacity-0'}`}>
					<Header />
					<div className='flex min-h-0 flex-1'>
						<div data-team-panel className='flex w-[296px] shrink-0 flex-col border-r border-line'>
							<TeamLibrary />
						</div>
						{merged ? (
							<div className='flex min-w-0 flex-1 flex-col'>
								<Inspector />
							</div>
						) : (
							<>
								<main className='flex min-w-0 flex-1 flex-col'>
									<Workspace />
								</main>
								<div className='flex w-[384px] shrink-0 flex-col border-l border-line'>
									<Inspector />
								</div>
							</>
						)}
					</div>
					{draftMode ? <DraftBoard /> : <BottomPanel />}
					{!draftMode && <BoxDrawer />}
				</div>
			)}
			<Dialogs />
			<Toasts />
		</DragLayer>
	);
}
