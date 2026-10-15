'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button, NumberBox, Select } from '@/components/ui/controls';
import { Dialog, Field } from '@/components/shell/Dialogs';
import { DRAFT_FORMATS } from '@/lib/dex';
import { costOf, defaultSettings, hasTera, teamSpecies } from '@/lib/draft/draft';
import { fetchLeague, uploadLeague } from '@/lib/draft/client';
import type { DraftSettings, Found, League } from '@/lib/draft/types';
import { useStore } from '@/lib/store';

/** "A", "A and B", "A, B and C". */
export const listOf = (names: string[]) => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

const FORMAT_OPTIONS = DRAFT_FORMATS.map((f) => ({ value: f.id, label: f.name, group: f.group }));

/** Where the sheet states a figure, and whether its places disagree. */
function sourceHint(found: Found[], value: number) {
	if (!found.length) return "The sheet doesn't say. Set it here.";
	const others = found.filter((f) => f.value !== value);
	const from = found.find((f) => f.value === value);
	const head = from ? `From ${from.where}.` : 'You changed this.';
	return others.length ? `${head} ${others.map((f) => `${f.where} says ${f.value}`).join('. ')}.` : head;
}

function SourceLine({ league }: { league: League }) {
	const live = league.source.kind === 'google';
	return (
		<div className='flex items-center gap-2 rounded-md border border-line px-3 py-2'>
			<Icon name={live ? 'link' : 'upload'} className='shrink-0 text-muted' />
			<div className='flex min-w-0 flex-1 flex-col'>
				<span className='truncate text-base font-semibold'>{league.title || (live ? 'League sheet' : 'Uploaded league')}</span>
				<span className='text-xs text-muted'>{live ? 'Live Google Sheet. Kingdra keeps it current.' : "Uploaded file. It won't update."}</span>
			</div>
			{league.source.kind === 'google' && (
				<a href={league.source.url} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline'>
					Open
					<Icon name='external' />
				</a>
			)}
		</div>
	);
}

function SetupForm() {
	const current = useStore((s) => s.library.draft);
	const replacing = useStore((s) => s.draftMode);
	const setDialog = useStore((s) => s.setDialog);
	const confirmDraft = useStore((s) => s.confirmDraft);
	const [league, setLeague] = useState<League | null>(current?.league ?? null);
	const [settings, setSettings] = useState<DraftSettings | null>(current?.settings ?? null);
	const [link, setLink] = useState(current?.league.source.kind === 'google' ? current.league.source.url : '');
	const [busy, setBusy] = useState<'link' | 'file' | null>(null);
	const [error, setError] = useState('');
	const file = useRef<HTMLInputElement>(null);
	const fresh = league !== current?.league;

	const load = async (kind: 'link' | 'file', run: () => Promise<League>) => {
		setBusy(kind);
		setError('');
		try {
			const next = await run();
			setLeague(next);
			setSettings(defaultSettings(next, current?.settings));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Kingdra couldn't read this sheet.");
		} finally {
			setBusy(null);
		}
	};
	const patch = (p: Partial<DraftSettings>) => setSettings((s) => (s ? { ...s, ...p } : s));
	const coaches = league?.coaches ?? [];

	return (
		<div className='flex flex-col gap-5'>
			<form
				className='flex flex-col gap-2'
				onSubmit={(e) => {
					e.preventDefault();
					if (link.trim()) void load('link', () => fetchLeague(link.trim()));
				}}
			>
				<span className='text-xs font-medium'>Google Sheets link</span>
				<div className='flex gap-2'>
					<input
						autoFocus={!league}
						value={link}
						onChange={(e) => setLink(e.target.value)}
						placeholder='https://docs.google.com/spreadsheets/d/...'
						aria-label='Google Sheets link'
						className='h-8 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-base outline-none placeholder:text-muted focus:border-accent'
					/>
					<Button type='submit' variant={league ? 'secondary' : 'accent'} icon='link' disabled={!link.trim() || !!busy}>
						{busy === 'link' ? 'Reading' : 'Read sheet'}
					</Button>
				</div>
				<span className='text-xs text-muted'>
					Kingdra reads the Tiers, Drafts and Rules tabs and keeps them current. Share the sheet so anyone with the link can view it.
				</span>
			</form>
			<div className='flex flex-col gap-2'>
				<div className='flex items-center gap-2'>
					<input
						ref={file}
						type='file'
						accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						hidden
						onChange={(e) => {
							const f = e.target.files?.[0];
							e.target.value = '';
							if (f) void load('file', () => uploadLeague(f));
						}}
					/>
					<Button icon='upload' disabled={!!busy} onClick={() => file.current?.click()}>
						{busy === 'file' ? 'Reading' : 'Upload an .xlsx file'}
					</Button>
				</div>
				<p className='flex items-start gap-1.5 text-xs text-muted'>
					<Icon name='warning' className='mt-px shrink-0' />
					An uploaded file is a snapshot. Kingdra won&apos;t see later picks or rule changes. Use a Google Sheets link to stay current.
				</p>
			</div>
			{error && (
				<p role='alert' className='flex items-start gap-1.5 text-xs text-danger'>
					<Icon name='warning' className='mt-px shrink-0' />
					{error}
				</p>
			)}
			{league && settings && (
				<>
					<div className='h-px bg-line' />
					<SourceLine league={league} />
					{replacing && fresh && (
						<p className='text-xs text-muted'>Your roster and teams stay. Kingdra prices your picks against this sheet and flags any that no longer fit.</p>
					)}
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<Field label='Format' hint={league.rules.format ? `The Rules tab names ${DRAFT_FORMATS.find((f) => f.id === league.rules.format)?.name ?? league.rules.format}.` : 'The Rules tab names no format Kingdra knows.'}>
							<Select label='Format' value={settings.format} options={FORMAT_OPTIONS} onChange={(format) => patch({ format })} />
						</Field>
						<Field label='Coach' hint="Other coaches' picks become unavailable. Your own picks on the sheet become suggestions.">
							<Select
								label='Coach'
								value={settings.coach ?? ''}
								options={[{ value: '', label: "I'm not a coach in this league" }, ...coaches.map((c) => ({ value: c.name, label: c.name }))]}
								onChange={(v) => patch({ coach: v || null })}
							/>
						</Field>
					</div>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
						<Field label='Points' hint={sourceHint(league.budget.points, settings.points)}>
							<NumberBox label='Points' width='w-16' value={settings.points} min={1} max={9999} onCommit={(points) => patch({ points })} />
						</Field>
						<Field label='Picks' hint={sourceHint(league.budget.picks, settings.picks)}>
							<NumberBox label='Picks' width='w-16' value={settings.picks} min={1} max={99} onCommit={(picks) => patch({ picks })} />
						</Field>
						{hasTera(league) && (
							<Field label='Tera Points' hint={sourceHint(league.budget.teraPoints, settings.teraPoints)}>
								<NumberBox label='Tera Points' width='w-16' value={settings.teraPoints} min={0} max={999} onCommit={(teraPoints) => patch({ teraPoints })} />
							</Field>
						)}
					</div>
					<p className='text-xs text-muted'>
						{league.tiers.length} Pokémon on the board, {league.banned.length} banned, {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'}.
						{!hasTera(league) && ' The sheet gives no Tera values, so there are no Tera Captains.'}
					</p>
					{league.unmatched.length > 0 && (
						<p className='flex items-start gap-1.5 text-xs text-danger'>
							<Icon name='warning' className='mt-px shrink-0' />
							Kingdra couldn&apos;t match {listOf(league.unmatched)}, so {league.unmatched.length === 1 ? 'it is' : 'they are'} off the board.
						</p>
					)}
					{(league.rules.enforced.length > 0 || league.rules.notEnforced.length > 0) && (
						<details className='text-xs'>
							<summary className='cursor-pointer font-medium'>
								Rules Kingdra checks ({league.rules.enforced.length + league.complexBans.length + league.banned.length})
							</summary>
							<ul className='mt-2 flex list-disc flex-col gap-1 pl-5 text-muted'>
								{league.rules.enforced.map((r) => <li key={r}>{r}</li>)}
								{league.banned.length > 0 && <li>{listOf(league.banned)} banned</li>}
								{league.complexBans.map((b) => <li key={`${b.species}+${b.with}`}>{b.species} can&apos;t use {b.with}</li>)}
							</ul>
							{league.rules.notEnforced.length > 0 && (
								<>
									<p className='mt-3 font-medium'>Rules Kingdra can&apos;t check</p>
									<ul className='mt-2 flex list-disc flex-col gap-1 pl-5 text-muted'>
										{league.rules.notEnforced.map((r) => <li key={r}>{r}</li>)}
									</ul>
								</>
							)}
						</details>
					)}
				</>
			)}
			<div className='flex flex-wrap items-center gap-2 pt-1'>
				<span className='flex-1' />
				<Button onClick={() => setDialog(null)}>Cancel</Button>
				<Button variant='accent' icon='draft' disabled={!league || !settings || !!busy} onClick={() => league && settings && confirmDraft(league, settings)}>
					{current ? 'Save' : 'Start drafting'}
				</Button>
			</div>
		</div>
	);
}

export function DraftSetupDialog() {
	const open = useStore((s) => s.dialog === 'draftSetup');
	const setDialog = useStore((s) => s.setDialog);
	const existing = useStore((s) => !!s.library.draft);
	return (
		<Dialog open={open} onClose={() => setDialog(null)} title={existing ? 'League sheet' : 'Draft mode'} width={600}>
			<SetupForm />
		</Dialog>
	);
}

export function ReleasePickDialog() {
	const open = useStore((s) => s.dialog === 'releasePick');
	const entry = useStore((s) => s.library.draft?.roster.find((r) => r.uid === s.pendingRelease));
	const league = useStore((s) => s.library.draft?.league);
	const teams = useStore((s) => s.library.teams);
	const confirmRelease = useStore((s) => s.confirmRelease);
	const close = () => useStore.setState({ dialog: null, pendingRelease: null });
	const name = entry?.species ?? 'this Pokémon';
	const on = entry ? teams.filter((t) => t.members.some((m) => m.species === teamSpecies(entry.species))).map((t) => t.name) : [];
	const refund = entry && league ? costOf(league, entry) : 0;
	return (
		<Dialog
			open={open && !!entry}
			onClose={close}
			title={`Release ${name}?`}
			width={420}
		>
			<p className='text-base text-muted'>
				{name} is on {listOf(on)}. Releasing it gives back {refund} pts and takes it off {on.length === 1 ? 'that team' : 'those teams'}.
			</p>
			<div className='flex flex-wrap items-center gap-2 pt-1'>
				<span className='flex-1' />
				<Button onClick={close}>Cancel</Button>
				<button type='button' autoFocus onClick={confirmRelease} className='squishy inline-flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-base font-medium text-white'>
					<Icon name='trash' />
					Release
				</button>
			</div>
		</Dialog>
	);
}
