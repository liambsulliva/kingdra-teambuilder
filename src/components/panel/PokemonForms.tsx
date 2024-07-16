// components/PokemonForms.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PokemonFormsProps {
	forms: PokemonForm[];
	height: number;
}

interface PokemonForm {
	name: string;
	url: string;
}

interface FormDetails {
	name: string;
	is_default: boolean;
	sprites: {
		front_default: string | null;
	};
	types: {
		type: {
			name: string;
		};
	}[];
}

const PokemonForms: React.FC<PokemonFormsProps> = ({ forms, height }) => {
	const [formDetails, setFormDetails] = useState<FormDetails[]>([]);

	useEffect(() => {
		const fetchFormDetails = async () => {
			try {
				const details = await Promise.all(
					forms.map(async (form) => {
						const response = await axios.get<FormDetails>(form.url);
						return response.data;
					})
				);
				setFormDetails(details);
			} catch (error) {
				console.error('Error fetching form details:', error);
			}
		};

		fetchFormDetails();
	}, [forms]);

	return (
		<div>
			<h3 className='mb-2 text-xl font-bold'>Alternate Forms:</h3>
			<div className={`flex h-[${height}rem] flex-wrap gap-4 overflow-y-auto`}>
				{formDetails
					.filter((form) => !form.is_default)
					.map((form, index) => (
						<div key={index} className='rounded border p-4'>
							<h4 className='text-center font-semibold'>
								{form.name
									.replace(/-/g, ' ')
									.replace(/(^|\s)\S/g, (match) => match.toUpperCase())}
							</h4>
							{form.sprites.front_default && (
								<img
									src={form.sprites.front_default}
									alt={form.name
										.replace(/-/g, ' ')
										.replace(/(^|\s)\S/g, (match) => match.toUpperCase())}
									className='mx-auto'
								/>
							)}
						</div>
					))}
			</div>
		</div>
	);
};

export default PokemonForms;
