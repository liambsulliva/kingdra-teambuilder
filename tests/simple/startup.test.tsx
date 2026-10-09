import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { App } from '@/components/shell/App';
import { useStore } from '@/lib/store';
import { emptyLibrary, newSet, newTeam } from '@/lib/model';
import { auth, seedLocalLibrary } from '../helpers/env';
import { flush, hasText } from '../helpers/render';

describe('startup', () => {
	it('server-renders the app frame, not an empty page', () => {
		const html = renderToString(<App />);
		expect(html).toContain('Kingdra');
		expect(html).toContain('aria-busy="true"');
	});

	it('hydrates the frame without a mismatch and shows a guest library while Clerk is still loading', async () => {
		seedLocalLibrary({ ...emptyLibrary(), teams: [newTeam({ name: 'Before Clerk', members: [newSet('Kingdra')] })] });
		auth.isLoaded = false;
		const container = document.createElement('div');
		container.innerHTML = renderToString(<App />);
		document.body.appendChild(container);
		const errors: unknown[] = [];
		const root = await act(async () => hydrateRoot(container, <App />, { onRecoverableError: (e) => errors.push(e) }));
		await flush();
		expect(errors).toEqual([]);
		expect(useStore.getState().hydrated).toBe(true);
		expect(hasText('Before Clerk')).toBe(true);
		act(() => root.unmount());
		container.remove();
	});

	it('opens the suggestions on a tab the first team has', () => {
		useStore.getState().hydrate({ ...emptyLibrary(), teams: [newTeam({ name: 'Casual', mode: 'casual', format: 'casual' })] });
		expect(useStore.getState().carouselTab).toBe('All');
	});
});
