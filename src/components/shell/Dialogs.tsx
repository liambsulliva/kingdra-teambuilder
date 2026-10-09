'use client';

import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { Button, Select } from '@/components/ui/controls';
import { formatsForGen } from '@/lib/dex';
import { importSet, importTeams } from '@/lib/showdown';
import type { Mode } from '@/lib/model';
import { useOpenTeam, useSelectedMember, useStore } from '@/lib/store';

export function Dialog({
	open,
	onClose,
	title,
	children,
	footer,
	width = 460,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	width?: number;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);
	return (
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={(e) => e.target === ref.current && onClose()}
			className='m-auto max-h-[90vh] w-[calc(100vw-32px)] rounded-xl border border-line bg-bg p-0 text-fg shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop:bg-fg/25 open:animate-[rise_200ms_cubic-bezier(0.22,1,0.36,1)]'
			style={{ maxWidth: width }}
		>
			{open && (
				<div className='flex flex-col gap-5 p-6 sm:px-7'>
					<div className='flex items-center'>
						<h2 className='font-head text-[20px] font-semibold leading-6 tracking-[-0.01em]'>{title}</h2>
						<span className='flex-1' />
						<IconButton icon='close' label='Close' onClick={onClose} tooltip='none' />
					</div>
					{children}
					{footer && <div className='flex flex-wrap items-center gap-2 pt-1'>{footer}</div>}
				</div>
			)}
		</dialog>
	);
}

export function ModeToggle({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
	return (
		<div role='radiogroup' aria-label='Mode' className='inline-flex gap-0.5 rounded-lg border border-line p-0.5'>
			{(['competitive', 'casual'] as const).map((m) => (
				<button
					key={m}
					type='button'
					role='radio'
					aria-checked={value === m}
					onClick={() => onChange(m)}
					className={`squishy inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-base font-medium ${
						value === m ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg'
					}`}
				>
					<Icon name={m} />
					{m === 'competitive' ? 'Competitive' : 'Casual'}
				</button>
			))}
		</div>
	);
}

const GEN_NAMES: Record<number, string> = {
	1: 'Red / Blue / Yellow',
	2: 'Gold / Silver / Crystal',
	3: 'Ruby / Sapphire / Emerald',
	4: 'Diamond / Pearl / Platinum',
	5: 'Black / White',
	6: 'X / Y',
	7: 'Sun / Moon',
	8: 'Sword / Shield',
	9: 'Scarlet / Violet',
};

export const genOptions = Array.from({ length: 9 }, (_, i) => 9 - i).map((g) => ({ value: String(g), label: `Gen ${g}: ${GEN_NAMES[g]}` }));

export function formatOptions(gen: number) {
	return formatsForGen(gen).map((f) => ({ value: f.id, label: f.name, group: f.group }));
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className='flex min-w-0 flex-1 flex-col gap-2'>
			<span className='text-xs font-medium'>{label}</span>
			{children}
			{hint && <span className='text-xs text-muted'>{hint}</span>}
		</div>
	);
}

function NewTeamDialog() {
	const open = useStore((s) => s.dialog === 'newTeam');
	const setDialog = useStore((s) => s.setDialog);
	const createTeam = useStore((s) => s.createTeam);
	const count = useStore((s) => s.library.teams.length);
	const [name, setName] = useState('');
	const [mode, setMode] = useState<Mode>('competitive');
	const [gen, setGen] = useState(9);
	const [format, setFormat] = useState('gen9ou');
	const submit = () => {
		createTeam({ name: name.trim() || `Team ${count + 1}`, mode, gen, format: mode === 'casual' ? 'casual' : format });
		setName('');
	};
	return (
		<Dialog
			open={open}
			onClose={() => setDialog(null)}
			title='New team'
			footer={
				<>
					<button type='button' onClick={() => setDialog('importTeam')} className='inline-flex items-center gap-1.5 text-xs font-medium hover:underline'>
						<Icon name='import' />
						Paste a Showdown team instead
					</button>
					<span className='flex-1' />
					<Button onClick={() => setDialog(null)}>Cancel</Button>
					<Button variant='accent' onClick={submit}>Create team</Button>
				</>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
				className='flex flex-col gap-5'
			>
				<Field label='Name'>
					<input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={`Team ${count + 1}`}
						className='h-9 rounded-md border border-line bg-bg px-3 text-base outline-none placeholder:text-muted focus:border-accent'
					/>
				</Field>
				<Field label='Mode' hint='Competitive unlocks formats, EVs, IVs, natures and roles. Casual is a lighter party planner. You can switch later; nothing is lost.'>
					<ModeToggle value={mode} onChange={setMode} />
				</Field>
				<div className='flex flex-col gap-4 sm:flex-row'>
					<Field label='Generation'>
						<Select
							label='Generation'
							value={String(gen)}
							options={genOptions}
							onChange={(v) => {
								const g = Number(v);
								setGen(g);
								setFormat(formatsForGen(g).find((f) => f.name === 'OU')?.id ?? formatsForGen(g)[0].id);
							}}
						/>
					</Field>
					{mode === 'competitive' && (
						<Field label='Format'>
							<Select label='Format' value={format} options={formatOptions(gen)} onChange={setFormat} />
						</Field>
					)}
				</div>
				<button type='submit' hidden />
			</form>
		</Dialog>
	);
}

function ImportDialog({ kind }: { kind: 'team' | 'set' }) {
	const open = useStore((s) => s.dialog === (kind === 'team' ? 'importTeam' : 'importSet'));
	const setDialog = useStore((s) => s.setDialog);
	const addTeams = useStore((s) => s.addTeams);
	const replaceSet = useStore((s) => s.replaceSet);
	const toast = useStore((s) => s.toast);
	const team = useOpenTeam();
	const member = useSelectedMember();
	const [text, setText] = useState('');
	const [error, setError] = useState('');
	const submit = () => {
		setError('');
		if (kind === 'team') {
			const { teams, skipped } = importTeams(text, { mode: team.mode, gen: team.gen, format: team.format === 'casual' ? `gen${team.gen}ou` : team.format });
			if (!teams.length) return setError("Couldn't find any Pokémon in that text. Paste a team exported from Showdown.");
			addTeams(teams);
			toast('success', `Imported ${teams.map((t) => t.name).join(', ')}`);
			if (skipped.length) toast('error', `Skipped ${skipped.join(', ')}`);
		} else {
			const set = importSet(text);
			if (!set || !member) return setError("Couldn't read a Pokémon from that text.");
			replaceSet(member.uid, set);
			toast('success', `Replaced ${member.name || member.species} with the pasted set`);
		}
		setText('');
		setDialog(null);
	};
	return (
		<Dialog
			open={open}
			onClose={() => setDialog(null)}
			title={kind === 'team' ? 'Import a team' : `Paste a set for ${member?.name || member?.species || 'this Pokémon'}`}
			width={560}
			footer={
				<>
					<span className='flex-1 text-xs text-muted'>
						{kind === 'team' ? 'Creates a new team. Nothing is overwritten.' : 'Replaces this member’s whole set.'}
					</span>
					<Button onClick={() => setDialog(null)}>Cancel</Button>
					<Button variant='accent' icon='import' onClick={submit} disabled={!text.trim()}>
						Import
					</Button>
				</>
			}
		>
			<textarea
				autoFocus
				value={text}
				onChange={(e) => setText(e.target.value)}
				spellCheck={false}
				rows={12}
				placeholder={'Kingdra @ Choice Specs\nAbility: Swift Swim\nTera Type: Water\nEVs: 252 SpA / 4 SpD / 252 Spe\nModest Nature\n- Draco Meteor\n- Surf\n- Hurricane\n- Flip Turn'}
				className='w-full resize-y rounded-md border border-line bg-bg p-3 text-base leading-6 outline-none placeholder:text-muted focus:border-accent'
			/>
			{error && (
				<p className='flex items-center gap-1.5 text-xs text-danger'>
					<Icon name='warning' />
					{error}
				</p>
			)}
		</Dialog>
	);
}

function DeleteMemberDialog() {
	const open = useStore((s) => s.dialog === 'deleteMember');
	const setDialog = useStore((s) => s.setDialog);
	const removeMember = useStore((s) => s.removeMember);
	const member = useSelectedMember();
	const name = member?.name || member?.species || 'this Pokémon';
	return (
		<Dialog
			open={open && !!member}
			onClose={() => setDialog(null)}
			title={`Delete ${name}?`}
			width={420}
			footer={
				<>
					<span className='flex-1' />
					<Button onClick={() => setDialog(null)}>Cancel</Button>
					<button
						type='button'
						autoFocus
						onClick={() => {
							if (member) removeMember(member.uid);
							setDialog(null);
						}}
						className='squishy inline-flex h-8 items-center gap-1.5 rounded-md bg-danger px-3 text-base font-medium text-white'
					>
						<Icon name='trash' />
						Delete
					</button>
				</>
			}
		>
			<p className='text-base text-muted'>Are you sure you want to delete {name}? Its set will be removed from the team. This cannot be undone.</p>
		</Dialog>
	);
}

export function Dialogs() {
	return (
		<>
			<DeleteMemberDialog />
			<NewTeamDialog />
			<ImportDialog kind='team' />
			<ImportDialog kind='set' />
		</>
	);
}

export function Toasts() {
	const toasts = useStore((s) => s.toasts);
	const dismiss = useStore((s) => s.dismissToast);
	return (
		<div className='pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 max-md:bottom-24' aria-live='polite'>
			{toasts.map((t) => (
				<button
					key={t.id}
					type='button'
					onClick={() => dismiss(t.id)}
					className='pointer-events-auto flex animate-[rise_200ms_cubic-bezier(0.22,1,0.36,1)] items-center gap-2 rounded-lg bg-fg px-3.5 py-2.5 text-base font-medium text-bg shadow-lg'
				>
					<Icon name={t.kind === 'success' ? 'check' : 'warning'} className={t.kind === 'error' ? 'text-danger' : ''} />
					{t.message}
				</button>
			))}
		</div>
	);
}
