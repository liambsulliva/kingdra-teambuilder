'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import Header from '@/components/layouts/header';
import Footer from '@/components/layouts/footer';
import PokeParty from '@/components/PokeParty';
import PokeInfo from '@/components/panel/PokeInfo';
import PokeFinder from '@/components/PokeFinder';
import Toast from '@/components/Toast';
import TypeCoverage from '@/components/TypeCoverage';
import type { pokemon } from '@/lib/pokemonInterface';
import NewTeamModal from '@/components/NewTeamModal';
import { fetchTeamNames, updateTeamNames } from '@/lib/teamNameFetch';
import debounce from 'lodash.debounce';

const Home = () => {
	const [gameMode, setGameMode] = useState<string>('competitive');
	const [pokemonParty, setPokemonParty] = useState<pokemon[][]>([[]]);
	const [numTeams, setNumTeams] = useState<number>(1);
	const [selectedPokemon, setSelectedPokemon] = useState<number>(-1);
	const [selectedTeam, setSelectedTeam] = useState<number>(0);
	const [enableToast, setEnableToast] = useState({
		enabled: false,
		type: '',
		message: '',
	});
	const [teamNames, setTeamNames] = useState<string[]>(['Team 1']);
	const [showNewTeamModal, setShowNewTeamModal] = useState(false);

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (enableToast.enabled) {
			timer = setTimeout(() => {
				setEnableToast((prev) => ({ ...prev, enabled: false }));
			}, 5000);
		}
		return () => clearTimeout(timer);
	}, [enableToast.enabled]);

	useEffect(() => {
		if (selectedTeam >= numTeams) {
			setSelectedTeam(Math.max(0, numTeams - 1));
		}
	}, [numTeams, selectedTeam]);

	useEffect(() => {
		const loadTeamNames = async () => {
			try {
				const names = await fetchTeamNames();
				setTeamNames(names);
			} catch (error) {
				console.error('Failed to load team names:', error);
			}
		};
		loadTeamNames();
	}, []);

	useEffect(() => {
		debounce(async () => {
			const handleUpdateTeamNames = async (newTeamNames: string[]) => {
				try {
					await updateTeamNames(newTeamNames);
					setTeamNames(newTeamNames);
				} catch (error) {
					console.error('Failed to update team names:', error);
				}
			};
			handleUpdateTeamNames(teamNames);
		}, 500);
	}, [teamNames]);

	const handleNewTeam = useCallback(() => {
		setShowNewTeamModal(true);
	}, []);

	const handleCreateNewTeam = useCallback((teamName: string) => {
		setNumTeams((prevNumTeams) => prevNumTeams + 1);
		setPokemonParty((prevParty) => [...prevParty, []]);
		setTeamNames((prevNames) => [...prevNames, teamName]);
		setSelectedTeam((prevSelectedTeam) => prevSelectedTeam + 1);
		setShowNewTeamModal(false);
	}, []);

	const handleDeleteTeam = useCallback(
		(index: number) => {
			if (numTeams <= 1) {
				setEnableToast({
					enabled: true,
					type: 'error',
					message: "You can't delete the last team!",
				});
				return;
			}

			setNumTeams((prevNumTeams) => prevNumTeams - 1);
			setPokemonParty((prevParty) => {
				const newParty = prevParty.filter((_, i) => i !== index);
				return newParty;
			});
			setTeamNames((prevNames) => prevNames.filter((_, i) => i !== index));
			setSelectedTeam((prevSelected) => {
				if (prevSelected >= index) {
					return Math.max(0, prevSelected - 1);
				}
				return prevSelected;
			});
		},
		[numTeams]
	);

	const handleTeamNameChange = useCallback((index: number, newName: string) => {
		setTeamNames((prevNames) => {
			const newNames = [...prevNames];
			newNames[index] = newName;
			return newNames;
		});
	}, []);

	const memoizedHeader = useMemo(
		() => (
			<Header
				setGameMode={setGameMode}
				numTeams={numTeams}
				setNumTeams={setNumTeams}
				selectedTeam={selectedTeam}
				setSelectedTeam={setSelectedTeam}
				onNewTeam={handleNewTeam}
				onDeleteTeam={handleDeleteTeam}
				teamNames={teamNames}
				onTeamNameChange={handleTeamNameChange}
			/>
		),
		[
			numTeams,
			selectedTeam,
			handleNewTeam,
			handleDeleteTeam,
			teamNames,
			handleTeamNameChange,
		]
	);

	return (
		<body
			className='mx-auto'
			style={{ width: '1850px', maxWidth: 'calc(100% - 1rem)' }}
		>
			<ClerkProvider>
				{memoizedHeader}
				<div className='font-serif mx-auto flex flex-col gap-8 p-8'>
					<div className='flex flex-col gap-4 md:flex-row'>
						<PokeParty
							pokemonParty={pokemonParty}
							setPokemonParty={setPokemonParty}
							setSelectedPokemon={setSelectedPokemon}
							selectedTeam={selectedTeam}
							setEnableToast={setEnableToast}
							setNumTeams={setNumTeams}
						/>
						<PokeInfo
							gameMode={gameMode}
							selectedPokemon={selectedPokemon}
							pokemonParty={pokemonParty}
							setPokemonParty={setPokemonParty}
							selectedTeam={selectedTeam}
							setEnableToast={setEnableToast}
						/>
					</div>
					{pokemonParty[selectedTeam]?.length > 0 && (
						<TypeCoverage
							pokemonParty={pokemonParty}
							selectedTeam={selectedTeam}
							setEnableToast={setEnableToast}
						/>
					)}
					<PokeFinder
						gameMode={gameMode}
						setPokemonParty={setPokemonParty}
						selectedTeam={selectedTeam}
						setEnableToast={setEnableToast}
					/>
				</div>
				{enableToast.enabled && (
					<Toast
						enabled={enableToast.enabled}
						type={enableToast.type}
						message={enableToast.message}
					/>
				)}
				<NewTeamModal
					show={showNewTeamModal}
					onClose={() => setShowNewTeamModal(false)}
					onConfirm={handleCreateNewTeam}
				/>
				<Footer />
			</ClerkProvider>
		</body>
	);
};

export default Home;
