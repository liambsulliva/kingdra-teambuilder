'use client';

import { useEffect, useState } from 'react';
import { useIsMerged, useIsMobile, usePersistence, useValidation } from '@/lib/hooks';
import { useOpenTeam, useStore } from '@/lib/store';
import { Header } from './Header';
import { Dialogs, Toasts } from './Dialogs';
import { DragLayer } from './DragLayer';
import { TeamLibrary } from '@/components/library/TeamLibrary';
import { Workspace } from '@/components/workspace/Workspace';
import { Inspector } from '@/components/inspector/Inspector';
import { BottomPanel } from '@/components/browse/BottomPanel';
import { BoxDrawer } from '@/components/browse/BoxDrawer';
import { MobileApp } from '@/components/mobile/MobileApp';

export function App() {
	usePersistence();
	const team = useOpenTeam();
	useValidation(team);
	const hydrated = useStore((s) => s.hydrated);
	const mobile = useIsMobile();
	const merged = useIsMerged();
	const setMerged = useStore((s) => s.setMerged);
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	useEffect(() => setMerged(merged), [merged, setMerged]);
	if (!mounted) return <div className='h-dvh' />;

	return (
		<DragLayer>
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
					<BottomPanel />
					<BoxDrawer />
				</div>
			)}
			<Dialogs />
			<Toasts />
		</DragLayer>
	);
}
