'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import Header from '@/components/layouts/header';
import Footer from '@/components/layouts/footer';
import PokeParty from '@/components/PokeParty';
import PokeInfo from '@/components/PokeInfo';
import PokeFinder from '@/components/PokeFinder';
import Toast from '@/components/ui/Toast';
import TypeCoverage from '@/components/TypeCoverage';
import type { pokemon } from '../../lib/pokemonInterface';

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

	const handleNewTeam = useCallback(() => {
		setNumTeams((prevNumTeams) => prevNumTeams + 1);
		setPokemonParty((prevParty) => [...prevParty, []]);
		setSelectedTeam((prevSelectedTeam) => prevSelectedTeam + 1);
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
			setSelectedTeam((prevSelected) => {
				if (prevSelected >= index) {
					return Math.max(0, prevSelected - 1);
				}
				return prevSelected;
			});
		},
		[numTeams]
	);

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
			/>
		),
		[numTeams, selectedTeam, handleNewTeam, handleDeleteTeam]
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
				<Footer />
			</ClerkProvider>
		</body>
	);
};

export default Home;
