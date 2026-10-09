'use client';

import { forwardRef } from 'react';
import { Icon, type IconName } from './Icon';

export function Button({
	variant = 'secondary',
	icon,
	children,
	className = '',
	...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'accent' | 'primary' | 'secondary'; icon?: IconName }) {
	const look = {
		accent: 'bg-accent text-white hover:brightness-110',
		primary: 'bg-fg text-bg hover:opacity-90',
		secondary: 'border border-line text-fg hover:bg-hover',
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
			className={`relative shrink-0 pb-1.5 pt-1.5 text-md transition-colors ${
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
		<span className={`relative inline-flex h-8 items-center ${className}`}>
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
		<label className={`flex h-8 items-center gap-2 rounded-md border border-line px-2.5 focus-within:border-accent focus-within:outline focus-within:outline-1 focus-within:outline-accent ${className}`}>
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
	return (
		<input
			aria-label={label}
			inputMode='numeric'
			key={value}
			defaultValue={value}
			onBlur={(e) => {
				const n = parseInt(e.target.value, 10);
				if (Number.isNaN(n)) e.target.value = String(value);
				else onCommit(Math.min(max, Math.max(min, n)));
			}}
			onKeyDown={(e) => {
				if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
				if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
					e.preventDefault();
					const step = e.shiftKey ? 10 : 1;
					onCommit(Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? step : -step))));
				}
			}}
			className={`h-6 ${width} rounded border bg-bg px-1.5 text-right text-xs tabular-nums text-fg outline-none focus:border-fg ${
				invalid ? 'border-danger' : 'border-line'
			}`}
		/>
	);
}
