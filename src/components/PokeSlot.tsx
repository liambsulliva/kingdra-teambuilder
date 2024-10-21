import '@/app/globals.css';
import CloseIcon from '@/components/icons/CloseIcon';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import type { pokemon } from '@/lib/pokemonInterface';
import { useState, useEffect } from 'react';

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
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

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
				className={`flex h-24 cursor-pointer items-center rounded bg-white transition-transform duration-200 hover:bg-gray-50 ${
					!pokemon ? 'bg-stone-50' : 'shadow'
				} ${isMobile ? 'w-full justify-start' : 'w-24 flex-col justify-center'}`}
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
						<img
							src={pokemon.sprite}
							alt={pokemon.name}
							className='h-24 w-24'
						/>
						{isMobile && (
							<span className='ml-4 text-2xl font-semibold'>
								{pokemon.name
									.toLowerCase()
									.replace(/(^|\s)\w/g, (c) => c.toUpperCase())}
							</span>
						)}
					</>
				) : (
					<div
						className={`h-24 rounded bg-stone-50 ${isMobile ? 'w-full' : 'w-24'}`}
					/>
				)}
			</div>
		</div>
	);
};

export default PokeSlot;
