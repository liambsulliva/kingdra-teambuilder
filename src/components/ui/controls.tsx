'use client';

import { forwardRef, useState } from 'react';
import { Icon, type IconName } from './Icon';

export function Button({
	variant = 'secondary',
	icon,
	children,
	className = '',
	...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'accent' | 'primary' | 'secondary' | 'ghost'; icon?: IconName }) {
	const look = {
		accent: 'bg-accent-solid text-white hover:brightness-95',
		primary: 'bg-fg text-bg hover:opacity-90',
		secondary: 'border border-line text-fg hover:bg-hover',
		ghost: 'text-accent hover:bg-accent-soft',
	}[variant];
	return (
		<button
			type='button'
			className={`squishy inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-base font-medium disabled:opacity-40 ${look} ${className}`}
			{...rest}
		>
			{icon && <Icon name={icon} />}
			{children}
		</button>
	);
}

/** Text tab: muted → fg, selected gets a 2 px Poké Ball red underline. */
export function Tab({ selected, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
	return (
		<button
			type='button'
			role='tab'
			aria-selected={selected}
			className={`squishy relative shrink-0 pb-1.5 pt-1.5 text-md transition-colors ${
				selected ? 'font-semibold text-fg' : 'font-medium text-muted hover:text-fg'
			}`}
			{...rest}
		>
			{children}
			<span className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full ${selected ? 'bg-accent' : 'bg-transparent'}`} />
		</button>
	);
}

export function Select({
	value,
	onChange,
	options,
	label,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string; group?: string }[];
	label: string;
	className?: string;
}) {
	const groups = [...new Set(options.map((o) => o.group ?? ''))];
	return (
		<span className={`squishy relative inline-flex h-8 items-center ${className}`}>
			<select
				aria-label={label}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className='h-8 w-full appearance-none rounded-md border border-line bg-bg pl-2.5 pr-8 text-base font-medium text-fg hover:bg-hover focus-visible:border-fg'
			>
				{groups.map((g) =>
					g ? (
						<optgroup key={g} label={g}>
							{options.filter((o) => o.group === g).map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</optgroup>
					) : (
						options.filter((o) => !o.group).map((o) => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))
					)
				)}
			</select>
			<Icon name='chevron-down' className='pointer-events-none absolute right-2 text-muted' />
		</span>
	);
}

export const SearchField = forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }
>(function SearchField({ className = '', onClear, value, ...rest }, ref) {
	return (
		<label className={`flex h-8 items-center gap-2 rounded-md bg-hover px-2.5 transition-colors focus-within:outline focus-within:outline-1 focus-within:outline-accent ${className}`}>
			<Icon name='search' className='text-muted' />
			<input
				ref={ref}
				type='search'
				value={value}
				className='w-full min-w-0 bg-transparent text-base text-fg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden'
				{...rest}
			/>
			{onClear && value ? (
				<button type='button' aria-label='Clear search' onClick={onClear} className='text-muted hover:text-fg'>
					<Icon name='close' />
				</button>
			) : null}
		</label>
	);
});

/**
 * A whole-number field. Only digits get in, a value outside [min, max] turns
 * red while it is typed, and blur or Enter commits it clamped to the range.
 * Arrow keys step from the typed value (1, or 10 with Shift).
 */
export function NumberBox({
	value,
	min,
	max,
	onCommit,
	label,
	width = 'w-11',
	invalid,
}: {
	value: number;
	min: number;
	max: number;
	onCommit: (value: number) => void;
	label: string;
	width?: string;
	invalid?: boolean;
}) {
	const [draft, setDraft] = useState(String(value));
	const [synced, setSynced] = useState(value);
	// The store moved the value under the field (another control, a reset): show that instead.
	if (synced !== value) {
		setSynced(value);
		setDraft(String(value));
	}
	const typed = draft === '' ? value : Number(draft);
	const outOfRange = draft !== '' && (typed < min || typed > max);
	const clamp = (n: number) => Math.min(max, Math.max(min, n));
	const commit = (next: number) => {
		setDraft(String(next));
		if (next !== value) onCommit(next);
	};
	return (
		<input
			aria-label={label}
			aria-invalid={outOfRange || undefined}
			inputMode='numeric'
			value={draft}
			onChange={(e) => {
				if (/^\d*$/.test(e.target.value)) setDraft(e.target.value);
			}}
			onBlur={() => commit(clamp(typed))}
			onKeyDown={(e) => {
				if (e.key === 'Enter') e.currentTarget.blur();
				if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
					e.preventDefault();
					commit(clamp(typed + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)));
				}
			}}
			className={`h-6 ${width} rounded border bg-bg px-1.5 text-right text-xs tabular-nums text-fg outline-none ${
				invalid || outOfRange ? 'border-danger focus:border-danger' : 'border-line focus:border-fg'
			}`}
		/>
	);
}
