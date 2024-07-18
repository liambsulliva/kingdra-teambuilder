import { useState, useEffect } from 'react';
import LoadingIcon from '@/components/icons/LoadingIcon';
import axios from 'axios';
import { FaPaw } from 'react-icons/fa';

interface PokemonSpeciesData {
	order: number;
	gender_rate: number;
	capture_rate: number;
	base_happiness: number;
	is_baby: boolean;
	is_legendary: boolean;
	is_mythical: boolean;
	hatch_counter: number;
	names: { name: string; language: { name: string; url: string } }[];
	growth_rate: { name: string; url: string };
	pokedex_numbers: {
		entry_number: number;
		pokedex: { name: string; url: string };
	}[];
	egg_groups: { name: string; url: string }[];
	color: { name: string; url: string };
	shape: { name: string; url: string };
	evolves_from_species: { name: string; url: string };
	generation: { name: string; url: string };
	flavor_text_entries: {
		flavor_text: string;
		language: { name: string; url: string };
		version: { name: string; url: string };
	}[];
	form_descriptions: {
		description: string;
		language: { name: string; url: string };
	}[];
	genera: { genus: string; language: { name: string; url: string } }[];
}

interface PokemonSpeciesInfoProps {
	url: string;
}

interface InfoItemProps {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}

const PokemonSpeciesInfo: React.FC<PokemonSpeciesInfoProps> = ({
	url,
}: PokemonSpeciesInfoProps) => {
	const [speciesInfo, setSpeciesInfo] = useState<PokemonSpeciesData | null>(
		null
	);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchSpeciesInfo = async () => {
			try {
				const response = await axios.get<PokemonSpeciesData>(url);
				setSpeciesInfo(response.data);
				setLoading(false);
			} catch (err) {
				setError('Failed to fetch Pokemon species data');
				console.error(err);
				setLoading(false);
			}
		};

		fetchSpeciesInfo();
	}, [url]);

	const formatName = (name: string): string => {
		return name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	if (loading) return <LoadingIcon />;
	if (error) return <p>{error}</p>;

	return (
		<div className='flex h-[38rem] flex-col gap-4 overflow-y-auto'>
			{speciesInfo ? (
				<>
					{speciesInfo.pokedex_numbers?.find(
						(entry) => entry.pokedex.name === 'national'
					)?.entry_number &&
						speciesInfo.flavor_text_entries?.find(
							(entry) => entry.language.name === 'en'
						)?.flavor_text && (
							<div className='flex flex-col gap-1'>
								<h1 className='text-xl font-bold'>{`National Dex #${speciesInfo.pokedex_numbers.find((entry) => entry.pokedex.name === 'national')?.entry_number}`}</h1>
								<p className='text-gray-500'>
									{
										speciesInfo.flavor_text_entries.find(
											(entry) => entry.language.name === 'en'
										)?.flavor_text
									}
								</p>
							</div>
						)}
					<div className='flex w-full flex-col gap-4 rounded border p-6'>
						{speciesInfo.generation?.name && (
							<p className='pb-4 text-xl font-bold'>
								{speciesInfo.generation.name
									.split('-')
									.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									.map((word, index) =>
										index === 1 ? word.toUpperCase() : word
									)
									.join(' ')}
							</p>
						)}
						<div className='grid grid-cols-2 gap-4'>
							{speciesInfo.order !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Order'
									value={speciesInfo.order}
								/>
							)}
							{speciesInfo.gender_rate !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Gender Rate'
									value={speciesInfo.gender_rate}
								/>
							)}
							{speciesInfo.capture_rate !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Capture Rate'
									value={speciesInfo.capture_rate}
								/>
							)}
							{speciesInfo.base_happiness !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Base Happiness'
									value={speciesInfo.base_happiness}
								/>
							)}
							{speciesInfo.is_baby !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Baby?'
									value={speciesInfo.is_baby ? 'Yes' : 'No'}
								/>
							)}
							{speciesInfo.is_legendary !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Legendary?'
									value={speciesInfo.is_legendary ? 'Yes' : 'No'}
								/>
							)}
							{speciesInfo.is_mythical !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Mythical?'
									value={speciesInfo.is_mythical ? 'Yes' : 'No'}
								/>
							)}
							{speciesInfo.hatch_counter !== undefined && (
								<InfoItem
									icon={<FaPaw />}
									label='Hatch Counter'
									value={speciesInfo.hatch_counter}
								/>
							)}
						</div>
					</div>
					<div className='flex gap-4'>
						{speciesInfo.growth_rate?.name && (
							<div className='flex-grow rounded border p-6'>
								<h3 className='mb-2 text-xl font-bold'>Growth Rate</h3>
								<p className='text-gray-500'>
									{formatName(speciesInfo.growth_rate.name)}
								</p>
							</div>
						)}

						{(speciesInfo.egg_groups?.find((group) => group.name)?.name ||
							speciesInfo.color?.name ||
							speciesInfo.shape?.name) && (
							<div className='flex-grow rounded border p-6'>
								<h3 className='mb-2 text-xl font-bold'>Egg Group</h3>
								{speciesInfo.egg_groups?.find((group) => group.name)?.name && (
									<p className='text-gray-500'>
										{formatName(
											speciesInfo.egg_groups.find((group) => group.name)!.name
										)}
									</p>
								)}
							</div>
						)}

						{speciesInfo.evolves_from_species?.name && (
							<div className='rounded border p-6'>
								<h3 className='mb-2 text-xl font-bold'>Evolution</h3>
								<p className='text-gray-500'>
									Evolves from{' '}
									{formatName(speciesInfo.evolves_from_species.name)}
								</p>
							</div>
						)}
					</div>
				</>
			) : (
				<p>No species data available for this Pokémon.</p>
			)}
		</div>
	);
};

const InfoItem: React.FC<InfoItemProps> = ({
	icon,
	label,
	value,
}: InfoItemProps) => (
	<div className='flex items-center'>
		{icon}
		<div className='ml-2'>
			<p className='font-semibold'>{label}</p>
			<p className='text-sm text-gray-600'>{value}</p>
		</div>
	</div>
);

export default PokemonSpeciesInfo;
