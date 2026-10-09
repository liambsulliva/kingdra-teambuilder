export const TYPE_COLORS: Record<string, string> = {
	Normal: '#9FA19F',
	Fire: '#E62829',
	Water: '#2980EF',
	Electric: '#FAC000',
	Grass: '#3FA129',
	Ice: '#3DCEF3',
	Fighting: '#FF8000',
	Poison: '#9141CB',
	Ground: '#915121',
	Flying: '#81B9EF',
	Psychic: '#EF4179',
	Bug: '#91A119',
	Rock: '#AFA981',
	Ghost: '#704170',
	Dragon: '#5060E1',
	Dark: '#624D4E',
	Steel: '#60A1B8',
	Fairy: '#EF70EF',
	Stellar: '#40B5A5',
	'???': '#68A090',
};

const luminance = (hex: string) => {
	const c = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/** White text unless its contrast on the type color drops under 2.9:1. */
export const typeText = (type: string) => (1.05 / (luminance(TYPE_COLORS[type] ?? '#9FA19F') + 0.05) >= 2.9 ? '#FFFFFF' : '#0A0A0A');

export function TypeBadge({ type, onClick, small }: { type: string; onClick?: () => void; small?: boolean }) {
	const style = { backgroundColor: TYPE_COLORS[type] ?? '#9FA19F', color: typeText(type) };
	const cls = `inline-flex shrink-0 items-center rounded font-medium ${small ? 'h-4 px-1 text-2xs' : 'h-5 px-1.5 text-xs'}`;
	if (!onClick) return <span className={cls} style={style}>{type}</span>;
	return (
		<button type='button' onClick={onClick} className={`squishy ${cls} hover:brightness-110`} style={style} title={`${type} matchups`}>
			{type}
		</button>
	);
}

export function TypeSwatch({ type }: { type: string }) {
	return <span aria-hidden className='inline-block size-2 shrink-0 rounded-sm' style={{ backgroundColor: TYPE_COLORS[type] }} />;
}
