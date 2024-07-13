import LevelSelect from './LevelSelect';
import type { pokemon, pokemonInfo } from '../../lib/pokemonInterface';

const PokemonBasicInfo = ({
	pokemonInfo,
	gameMode,
	selectedPokemon,
	pokemonParty,
	setPokemonParty,
	selectedTeam,
}: {
	pokemonInfo: pokemonInfo;
	gameMode: string;
	selectedPokemon: number;
	pokemonParty: pokemon[][];
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}) => {
	return (
		<div className='flex flex-col gap-2'>
			<div className='flex max-md:justify-center max-md:gap-4'>
				<div className='flex h-32 w-32 items-center justify-center'>
					{pokemonInfo.sprites.versions['generation-v']['black-white'].animated
						.front_default ? (
						<img
							src={
								pokemonInfo.sprites.versions['generation-v']['black-white']
									.animated.front_default
							}
							alt={pokemonInfo.name}
							className='object-contain'
						/>
					) : (
						<img
							src={pokemonParty[selectedTeam][selectedPokemon].sprite}
							alt={pokemonParty[selectedTeam][selectedPokemon].name}
							className='object-contain'
						/>
					)}
				</div>
				<div
					className={`flex flex-col ${gameMode === 'competitive' ? 'justify-end' : 'justify-center'}`}
				>
					<h2 className='mb-3 text-4xl font-bold capitalize text-black'>
						{(() => {
							const nameParts = pokemonInfo.name.split('-');
							if (nameParts.length > 1) {
								const form = nameParts.pop();
								if (form && ['galar', 'hisui', 'alola'].includes(form)) {
									const regionName =
										form === 'galar'
											? 'Galarian'
											: form === 'hisui'
												? 'Hisuian'
												: 'Alolan';
									return `${regionName} ${nameParts
										.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
										.join(' ')}`;
								}
							}
							return pokemonInfo.name
								.split('-')
								.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
								.join(' ');
						})()}
					</h2>
					{gameMode === 'competitive' && (
						<LevelSelect
							selectedPokemon={selectedPokemon}
							pokemonParty={pokemonParty}
							setPokemonParty={setPokemonParty}
							selectedTeam={selectedTeam}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default PokemonBasicInfo;
