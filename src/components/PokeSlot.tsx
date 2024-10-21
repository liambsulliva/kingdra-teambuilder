import '@/app/globals.css';
import CloseIcon from '@/components/icons/CloseIcon';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import type { pokemon } from '@/lib/pokemonInterface';

const PokeSlot = ({
	pokemon,
	setPokemonParty,
	selectedTeam,
	onClick,
}: {
	pokemon: pokemon | null;
	index: number;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setSelectedPokemon: React.Dispatch<React.SetStateAction<number>>;
	selectedTeam: number;
	onClick: () => void;
}) => {
	const { isSignedIn } = useAuth();
	const handleDelete = async () => {
		if (!pokemon) {
			return;
		}
		try {
			setPokemonParty((prevPokemonParty: pokemon[][]) => {
				return prevPokemonParty.map((team, teamIndex) => {
					if (teamIndex === selectedTeam) {
						return team.filter((p) => p.id !== pokemon.id);
					}
					return team;
				});
			});
			if (isSignedIn) {
				const response = await axios.delete(
					`/api/pokemon-party/?id=${pokemon.id}`
				);
				if (response.status === 201) {
					//console.log("DELETE Success");
				} else {
					console.log('DELETE Failure');
				}
			}
		} catch (error) {
			console.log('Internal Server Error');
		}
	};
	return (
		<div className='relative'>
			<div
				className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded bg-white transition-transform duration-200 hover:bg-gray-50 max-md:w-full ${
					!pokemon ? 'bg-stone-50' : ''
				}`}
				onClick={onClick}
			>
				{pokemon ? (
					<>
						<div
							className='absolute right-0 top-0 -translate-y-2 translate-x-2'
							onClick={(e) => {
								e.stopPropagation();
								handleDelete();
							}}
						>
							<CloseIcon />
						</div>
						<img src={pokemon.sprite} alt={pokemon.name} />
					</>
				) : (
					<div className='h-24 w-24 rounded bg-stone-50 max-md:w-full' />
				)}
			</div>
		</div>
	);
};

export default PokeSlot;
