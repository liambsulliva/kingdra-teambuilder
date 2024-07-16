import '@/app/globals.css';
import typeMatchups from '@/lib/typeMatchups.json';
import TypeBadge from '@/components/icons/TypeBadge';
import { Tooltip } from 'flowbite-react';
import type { pokemon, pokemonInfo } from '@/lib/pokemonInterface';
import TeraSelect from '@/components/panel/TeraSelect';

const PokemonTypeInfo = ({
	pokemonInfo,
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	selectedTeam,
}: {
	pokemonInfo: pokemonInfo;
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	selectedTeam: number;
}) => {
	const calculateCombinedMatchups = (types: string[]) => {
		const effectiveness: { [key: string]: number } = {};

		types.forEach((type) => {
			const matchups = typeMatchups[type as keyof typeof typeMatchups];

			matchups.weaknesses.forEach((w) => {
				effectiveness[w] = (effectiveness[w] || 1) * 2;
			});
			matchups.resistances.forEach((r) => {
				effectiveness[r] = (effectiveness[r] || 1) * 0.5;
			});
			matchups.immunities.forEach((i) => {
				effectiveness[i] = 0;
			});
		});

		const weaknesses: string[] = [];
		const resistances: string[] = [];
		const immunities: string[] = [];

		Object.entries(effectiveness).forEach(([type, value]) => {
			if (value > 1) weaknesses.push(type);
			else if (value < 1 && value > 0) resistances.push(type);
			else if (value === 0) immunities.push(type);
		});

		return { weaknesses, resistances, immunities };
	};

	const combinedMatchups = calculateCombinedMatchups(
		pokemonInfo.types.map((t: { type: { name: string } }) => t.type.name)
	);

	return (
		<div className='flex flex-col'>
			<p className='mb-4 flex items-center gap-2.5 text-xl text-gray-600 max-md:flex-col'>
				Type:
				<div className='relative flex items-center gap-2 px-2 max-md:flex-wrap'>
					<Tooltip
						content={
							<div className='w-64 p-2'>
								<p className='mb-2 font-bold'>Weaknesses:</p>
								<div className='mb-2 flex flex-wrap gap-1'>
									{combinedMatchups.weaknesses.length > 0 ? (
										combinedMatchups.weaknesses.map((type, index) => (
											<TypeBadge key={index} type={type} size={3} />
										))
									) : (
										<span>None</span>
									)}
								</div>
								<p className='mb-2 font-bold'>Resistances:</p>
								<div className='mb-2 flex flex-wrap gap-1'>
									{combinedMatchups.resistances.length > 0 ? (
										combinedMatchups.resistances.map((type, index) => (
											<TypeBadge key={index} type={type} size={3} />
										))
									) : (
										<span>None</span>
									)}
								</div>
								<p className='mb-2 font-bold'>Immunities:</p>
								<div className='flex flex-wrap gap-1'>
									{combinedMatchups.immunities.length > 0 ? (
										combinedMatchups.immunities.map((type, index) => (
											<TypeBadge key={index} type={type} size={3} />
										))
									) : (
										<span>None</span>
									)}
								</div>
							</div>
						}
						style='light'
					>
						<div className='flex gap-2'>
							{pokemonInfo.types.map(
								(typeInfo: { type: { name: string } }, index: number) => (
									<TypeBadge key={index} type={typeInfo.type.name} size={5} />
								)
							)}
						</div>
					</Tooltip>
				</div>
			</p>
			<p className='mb-4 flex items-center gap-2.5 text-xl text-gray-600 max-md:flex-col'>
				Tera Type:
				<div className='flex items-center gap-2 px-2 max-md:flex-wrap'>
					<TeraSelect
						selectedPokemon={selectedPokemon}
						pokemonParty={pokemonParty}
						setPokemonParty={setPokemonParty}
						selectedTeam={selectedTeam}
					/>
				</div>
			</p>
		</div>
	);
};

export default PokemonTypeInfo;
