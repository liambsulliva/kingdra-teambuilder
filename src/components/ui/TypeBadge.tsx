// components/TypeBadge.tsx

import React from 'react';
import typeColors from '../../../lib/typeColors.json';

interface TypeBadgeProps {
	type: string;
	size: number; // This will now represent the size in rem
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size }) => {
	const color = typeColors[type as keyof typeof typeColors] || '808080'; // Default to gray if type not found

	return (
		<div
			className='flex cursor-default items-center justify-center rounded-xl'
			style={{
				padding: `${size / 8.5}rem ${size / 4.5}rem`,
				backgroundColor: `#${color}`,
			}}
		>
			<p
				className='text-center font-semibold capitalize text-white'
				style={{ fontSize: `${size / 4}rem` }}
			>
				{type}
			</p>
		</div>
	);
};

export default TypeBadge;
