'use client';
import '@/app/globals.css';
import type { pokemon } from '../../lib/pokemonInterface';

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
	const handleClick = async () => {
		try {
			setPokemonParty((prevPokemonParty: pokemon[][]) => {
				console.log('Previous Pokemon Party:', prevPokemonParty);
				console.log('Selected Team:', selectedTeam);

				// Check if prevPokemonParty is an array
				if (!Array.isArray(prevPokemonParty)) {
					console.error('prevPokemonParty is not an array');
					setEnableToast({
						enabled: true,
						type: 'error',
						message: 'Invalid party structure.',
					});
					return prevPokemonParty;
				}

				// Check if selectedTeam is valid
				if (selectedTeam < 0 || selectedTeam >= prevPokemonParty.length) {
					console.error('Invalid selectedTeam index:', selectedTeam);
					setEnableToast({
						enabled: true,
						type: 'error',
						message: 'Invalid team selection.',
					});
					return prevPokemonParty;
				}

				// Ensure the selected team exists
				if (!Array.isArray(prevPokemonParty[selectedTeam])) {
					console.error(
						'Selected team is not an array:',
						prevPokemonParty[selectedTeam]
					);
					const newPokemonParty = [...prevPokemonParty];
					newPokemonParty[selectedTeam] = [];
					return newPokemonParty;
				}

				// Rest of your logic...
				if (prevPokemonParty[selectedTeam].length >= 6) {
					setEnableToast({
						enabled: true,
						type: 'error',
						message: 'Your current team is full!',
					});
					return prevPokemonParty;
				} else if (
					!prevPokemonParty[selectedTeam].some((p) => p.id === pokemon.id)
				) {
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
					newPokemonParty[selectedTeam] = [
						...newPokemonParty[selectedTeam],
						updatedPokemon,
					];
					return newPokemonParty;
				}
				setEnableToast({
					enabled: true,
					type: 'error',
					message: 'This Pokémon is already on your team!',
				});
				return prevPokemonParty;
			});
		} catch (error) {
			console.error('Error in handleClick:', error);
			setEnableToast({
				enabled: true,
				type: 'error',
				message: 'There was an error adding your Pokémon.',
			});
		}
	};

	return (
		<div
			className="flex h-44 w-32 cursor-pointer flex-col items-center justify-center rounded bg-[#fff] shadow transition-transform duration-200 hover:bg-gray-50 md:h-32"
			onClick={handleClick}
		>
			<img
				className="md:h-24 md:w-24"
				src={pokemon.sprite}
				alt={pokemon.name}
			/>
			<p className="text-center text-sm">{pokemon.name}</p>
		</div>
	);
};

export default PokeFinderCard;
