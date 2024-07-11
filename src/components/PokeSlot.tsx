import '@/app/globals.css';
import CloseIcon from './CloseIcon';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import type { pokemon } from '../../lib/pokemonInterface';

export default function PokeSlot({
	pokemon,
	index,
	setPokemonParty,
	setSelectedPokemon,
	selectedTeam,
}: {
	pokemon: pokemon | null;
	index: number;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setSelectedPokemon: React.Dispatch<React.SetStateAction<number>>;
	selectedTeam: number;
}) {
	const { isSignedIn } = useAuth();
	const handleDelete = async () => {
		if (!pokemon) {
			return null;
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
		<div className="relative">
			{pokemon ? (
				<div
					className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded bg-[#fff] shadow transition-transform duration-200 hover:bg-gray-50"
					onClick={() => {
						setSelectedPokemon((selected) => (selected === index ? -1 : index));
					}}
				>
					<div
						className="absolute right-0 top-0 -translate-y-2 translate-x-2"
						onClick={() => {
							handleDelete();
						}}
					>
						<CloseIcon />
					</div>
					<img src={pokemon.sprite} alt={pokemon.name} />
				</div>
			) : (
				<div className="h-24 w-24 rounded bg-[#f9f9f9]" />
			)}
		</div>
	);
}
