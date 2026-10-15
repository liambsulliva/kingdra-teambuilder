'use client';

import { useEffect } from 'react';
import { useStore } from '../store';
import { fetchLeague } from './client';

/** A sheet read longer ago than this is re-read when the tab comes back into view. */
export const STALE_MS = 60_000;

const sheetOf = () => {
	const s = useStore.getState();
	const source = s.draftMode ? s.library.draft?.league.source : undefined;
	return source?.kind === 'google' ? source.sheetId : null;
};

/** Re-reads the league sheet. An uploaded file never syncs; a sync already running isn't doubled. */
export async function syncDraft() {
	const sheet = sheetOf();
	const s = useStore.getState();
	if (!sheet || s.draftSync.status === 'syncing') return;
	s.setDraftSync({ ...s.draftSync, status: 'syncing' });
	try {
		const league = await fetchLeague(sheet);
		// The user may have left Draft Mode or swapped sheets while it loaded.
		if (sheetOf() === sheet) useStore.getState().syncLeague(league);
		else useStore.getState().setDraftSync({ status: 'idle' });
	} catch (error) {
		useStore.getState().setDraftSync({ status: 'error', message: error instanceof Error ? error.message : "Kingdra couldn't read the sheet.", at: useStore.getState().draftSync.at });
	}
}

/** When the sheet was last read: the last sync, or the read the draft was set up from. */
export function lastSynced(s: ReturnType<typeof useStore.getState>) {
	return s.draftSync.at ?? s.library.draft?.league.syncedAt ?? 0;
}

/** Syncs on entering Draft Mode, and on coming back to the tab once the last read is a minute old. */
export function useDraftSync() {
	const sheet = useStore((s) => {
		const source = s.draftMode ? s.library.draft?.league.source : undefined;
		return source?.kind === 'google' ? source.sheetId : null;
	});
	useEffect(() => {
		if (!sheet) return;
		void syncDraft();
		const onShow = () => {
			if (document.visibilityState === 'visible' && Date.now() - lastSynced(useStore.getState()) > STALE_MS) void syncDraft();
		};
		document.addEventListener('visibilitychange', onShow);
		window.addEventListener('focus', onShow);
		return () => {
			document.removeEventListener('visibilitychange', onShow);
			window.removeEventListener('focus', onShow);
		};
	}, [sheet]);
}

export function DraftSyncer() {
	useDraftSync();
	return null;
}
