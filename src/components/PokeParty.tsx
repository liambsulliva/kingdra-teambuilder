import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import PokeSlot from '@/components/PokeSlot';
import GlobalIETabber from '@/components/GlobalIETabber';
import debounce from 'lodash.debounce';
import '@/app/globals.css';
import type { pokemon } from '@/lib/pokemonInterface';
import { Modal } from 'flowbite-react';
import PokeInfo from '@/components/panel/PokeInfo';
import PokeFinder from '@/components/PokeFinder';
import { Button } from 'flowbite-react';

const PokeParty = ({
	pokemonParty,
	teamNames,
	setTeamNames,
	setPokemonParty,
	setSelectedPokemon,
	setEnableToast,
	selectedTeam,
	setNumTeams,
	gameMode,
}: {
	pokemonParty: pokemon[][];
	teamNames: string[];
	setTeamNames: React.Dispatch<React.SetStateAction<string[]>>;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setSelectedPokemon: React.Dispatch<React.SetStateAction<number>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
	setNumTeams: React.Dispatch<React.SetStateAction<number>>;
	gameMode: string;
}) => {
	const { isSignedIn } = useAuth();
	const [isMobile, setIsMobile] = useState<boolean>(false);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [modalPokemonIndex, setModalPokemonIndex] = useState<number>(-1);
	const [isPokeFinderModalOpen, setIsPokeFinderModalOpen] =
		useState<boolean>(false);

	// Check for mobile screen size
	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 768);
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Callback needed for fetch
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedFetchPokemonParty = useCallback(
		debounce(async () => {
			if (isSignedIn) {
				try {
					const response = await axios.get('/api/pokemon-party');
					setPokemonParty(response.data.pokemonParty);
					setNumTeams(response.data.pokemonParty.length);
					setTeamNames(response.data.teamNames);
				} catch (error) {
					setEnableToast({
						enabled: true,
						type: 'error',
						message: `Failed to fetch Pokémon team from server: `,
					});
				}
			} else {
				setPokemonParty([[]]);
			}
		}, 500),
		[isSignedIn]
	);

	const debouncedPostPokemonParty = debounce(async () => {
		if (isSignedIn) {
			try {
				const response = await axios.post('/api/pokemon-party', {
					teamNames,
					pokemonParty,
				});
				// Handle the response here
				if (response.status === 201) {
					//console.log("POST Success");
				} else {
					console.log('POST Failure');
				}
			} catch (error) {
				{
					/*
					setEnableToast({
					enabled: true,
					type: 'error',
					message: `Failed to submit Pokémon team to server: ${error}`,
					});
					*/
				}
			}
		}
	}, 500);

	useEffect(() => {
		debouncedFetchPokemonParty();
	}, [isSignedIn, debouncedFetchPokemonParty]);

	useEffect(() => {
		debouncedPostPokemonParty();
	}, [pokemonParty, teamNames, debouncedPostPokemonParty]);

	const handleSlotClick = (index: number) => {
		if (isMobile) {
			setModalPokemonIndex(index);
			setIsModalOpen(true);
		} else {
			setSelectedPokemon(index);
		}
	};

	const handleAddPokemon = () => {
		if (isMobile) {
			setIsPokeFinderModalOpen(true);
		}
	};

	return (
		<div className='flex flex-col items-center md:py-4'>
			<div
				className={`grid gap-4 p-6 max-md:w-full ${isMobile ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-1 md:grid-cols-2'}`}
			>
				{isMobile && (
					<>
						<Button
							onClick={handleAddPokemon}
							color='light'
							className='mx-8 mb-2'
						>
							Add Pokemon
						</Button>
						<Modal
							show={isPokeFinderModalOpen}
							size='xl'
							onClose={() => setIsPokeFinderModalOpen(false)}
							position='bottom-center'
						>
							<Modal.Header>Add Pokemon</Modal.Header>
							<Modal.Body>
								<PokeFinder
									gameMode={gameMode}
									setPokemonParty={setPokemonParty}
									setEnableToast={setEnableToast}
									selectedTeam={selectedTeam}
								/>
							</Modal.Body>
						</Modal>
					</>
				)}
				{pokemonParty[selectedTeam]?.map((pokemon, index) => (
					<PokeSlot
						key={pokemon.id}
						pokemon={pokemon}
						index={index}
						setPokemonParty={setPokemonParty}
						setSelectedPokemon={setSelectedPokemon}
						selectedTeam={selectedTeam}
						onClick={() => handleSlotClick(index)}
					/>
				))}
				{Array(Math.max(0, 6 - (pokemonParty[selectedTeam]?.length || 0))).fill(
					<PokeSlot
						pokemon={null}
						index={-1}
						setPokemonParty={setPokemonParty}
						setSelectedPokemon={setSelectedPokemon}
						selectedTeam={selectedTeam}
						onClick={() => {}}
					/>
				)}
			</div>
			<div>
				<GlobalIETabber
					pokemonParty={pokemonParty}
					setPokemonParty={setPokemonParty}
					setEnableToast={setEnableToast}
					selectedTeam={selectedTeam}
				/>
			</div>
			{isMobile && (
				<Modal
					show={isModalOpen}
					size='xl'
					onClose={() => setIsModalOpen(false)}
				>
					<Modal.Header>Pokémon Info</Modal.Header>
					<Modal.Body>
						{modalPokemonIndex !== -1 && (
							<PokeInfo
								gameMode={gameMode}
								selectedPokemon={modalPokemonIndex}
								pokemonParty={pokemonParty}
								setPokemonParty={setPokemonParty}
								setEnableToast={setEnableToast}
								selectedTeam={selectedTeam}
							/>
						)}
					</Modal.Body>
				</Modal>
			)}
		</div>
	);
};

export default PokeParty;
