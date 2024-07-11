'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import PokeParty from '@/components/PokeParty';
import PokeInfo from '@/components/PokeInfo';
import PokeFinder from '@/components/PokeFinder';
import Toast from '@/components/Toast';
import TypeCoverage from '@/components/TypeCoverage';
import { useEffect, useState } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import type { pokemon } from '../../lib/pokemonInterface';

export default function Home() {
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

	useEffect(() => {
		console.log('Pokemon Party:');
		console.log(pokemonParty);
		console.log(`NumTeams: ${numTeams}`);
	}, [pokemonParty, numTeams]);

	const handleNewTeam = () => {
		setNumTeams((prevNumTeams) => prevNumTeams + 1);
		setPokemonParty((prevParty) => [...prevParty, []]);
		setSelectedTeam((prevSelectedTeam) => prevSelectedTeam + 1);
	};

	const handleDeleteTeam = (index: number) => {
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
	};

	return (
		<body
			className='mx-auto'
			style={{ width: '1850px', maxWidth: 'calc(100% - 1rem)' }}
		>
			<ClerkProvider>
				<Header
					setGameMode={setGameMode}
					numTeams={numTeams}
					setNumTeams={setNumTeams}
					selectedTeam={selectedTeam}
					setSelectedTeam={setSelectedTeam}
					onNewTeam={handleNewTeam}
					onDeleteTeam={handleDeleteTeam}
				/>
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
							selectedPokemon={selectedPokemon}
							pokemonParty={pokemonParty}
							setPokemonParty={setPokemonParty}
							selectedTeam={selectedTeam}
							setEnableToast={setEnableToast}
						/>
					</div>
					{pokemonParty[selectedTeam]?.length > 0 && gameMode === 'casual' && (
						<TypeCoverage
							pokemonParty={pokemonParty}
							selectedTeam={selectedTeam}
							setEnableToast={setEnableToast}
						/>
					)}
					<PokeFinder
						setPokemonParty={setPokemonParty}
						selectedTeam={selectedTeam}
						setEnableToast={setEnableToast}
					/>
				</div>
				{enableToast && (
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
}
