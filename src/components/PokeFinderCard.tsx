import '@/app/globals.css';
import type { pokemon } from '@/lib/pokemonInterface';

interface PokeFinderCardProps {
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	pokemon: pokemon;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	selectedTeam: number;
}

const PokeFinderCard: React.FC<PokeFinderCardProps> = ({
	setEnableToast,
	pokemon,
	setPokemonParty,
	selectedTeam,
}: PokeFinderCardProps) => {
	const handleClick = () => {
		setPokemonParty((prevPokemonParty: pokemon[][]) => {
			if (
				!Array.isArray(prevPokemonParty) ||
				selectedTeam < 0 ||
				selectedTeam >= prevPokemonParty.length
			) {
				setEnableToast({
					enabled: true,
					type: 'error',
					message: 'Invalid team selection.',
				});
				return prevPokemonParty;
			}

			const currentTeam = prevPokemonParty[selectedTeam] || [];

			if (currentTeam.length >= 6) {
				setEnableToast({
					enabled: true,
					type: 'error',
					message: 'Your current team is full!',
				});
				return prevPokemonParty;
			}

			if (currentTeam.some((p) => p.id === pokemon.id)) {
				setEnableToast({
					enabled: true,
					type: 'error',
					message: 'This Pokémon is already on your team!',
				});
				return prevPokemonParty;
			}

			setEnableToast({
				enabled: true,
				type: 'success',
				message: 'Pokèmon Added Successfully!'
			});

			const updatedPokemon: pokemon = {
				...pokemon,
				name: pokemon.name || '',
				id: pokemon.id || 0,
				sprite: pokemon.sprite || '',
				level: 100,
				ability: '',
				nature: '',
				item: '',
				tera_type: '',
				moves: ['', '', '', ''],
				iv: [31, 31, 31, 31, 31, 31],
				ev: [0, 0, 0, 0, 0, 0],
			};

			const newPokemonParty = [...prevPokemonParty];
			newPokemonParty[selectedTeam] = [...currentTeam, updatedPokemon];
			return newPokemonParty;
		});
	};

	return (
		<div
			className='flex h-44 w-32 cursor-pointer flex-col items-center justify-center rounded bg-white shadow transition-transform duration-200 hover:bg-gray-50 md:h-32'
			onClick={handleClick}
		>
			<img
				className='md:h-24 md:w-24'
				src={pokemon.sprite}
				alt={pokemon.name
					.replace(/-/g, ' ')
					.replace(/(^|\s)\S/g, (match) => match.toUpperCase())}
				loading='lazy'
			/>
			<p className='text-center text-sm'>
				{pokemon.name
					.replace(/-/g, ' ')
					.replace(/(^|\s)\S/g, (match) => match.toUpperCase())}
			</p>
		</div>
	);
};

PokeFinderCard.displayName = 'PokeFinderCard';

export default PokeFinderCard;
