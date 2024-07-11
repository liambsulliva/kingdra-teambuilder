'use client';
import '@/app/globals.css';
import { useEffect, useState, useCallback } from 'react';
import PokeFinderCard from './PokeFinderCard';
import LoadingIcon from './LoadingIcon';
import type { pokemon } from '../../lib/pokemonInterface';
import { Tabs } from 'flowbite-react';

export default function PokeFinder({
	setPokemonParty,
	setEnableToast,
	selectedTeam,
}: {
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}) {
	const [pokemonData, setPokemonData] = useState<pokemon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchResults, setSearchResults] = useState<pokemon[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedGeneration, setSelectedGeneration] = useState(0);

	const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newSearchTerm = event.target.value.toLowerCase();
		setSearchTerm(newSearchTerm);
	};

	useEffect(() => {
		const filteredPokemon = pokemonData.filter((pokemon: pokemon) =>
			pokemon.name.toLowerCase().includes(searchTerm)
		);
		setSearchResults(filteredPokemon);
	}, [searchTerm, pokemonData]);

	const fetchData = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch(
				`/api/pokemon?page=${currentPage}&generation=${selectedGeneration}`
			);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.json();
			const newPokemonData = data.pokemonData.map((pokemon: pokemon) => ({
				...pokemon,
				name: pokemon.name
					.split('-')
					.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
					.join('-'),
			}));
			setPokemonData((prevData: pokemon[]) =>
				currentPage === 1 ? newPokemonData : [...prevData, ...newPokemonData]
			);
		} catch (error) {
			setEnableToast({
				enabled: true,
				type: 'error',
				message: `Failed to fetch basic pokemon data from server.`,
			});
		} finally {
			setIsLoading(false);
		}
	}, [currentPage, selectedGeneration]);

	const handleScroll = useCallback(() => {
		const scrollPosition = window.innerHeight + window.scrollY;
		const documentHeight = document.body.offsetHeight;
		const scrollThreshold = documentHeight - 500;

		if (scrollPosition >= scrollThreshold && !isLoading) {
			setCurrentPage((prevPage) => prevPage + 1);
		}
	}, [isLoading]);

	useEffect(() => {
		setCurrentPage(1);
		setPokemonData([]);
	}, [selectedGeneration]);

	useEffect(() => {
		fetchData();
	}, [fetchData, currentPage, selectedGeneration]);

	useEffect(() => {
		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, [handleScroll]);

	return (
		<div className='flex flex-col'>
			<div className='relative flex w-full flex-col justify-center px-4 text-gray-600 md:flex-row md:justify-between'>
				<Tabs
					aria-label='Tabs with underline'
					onActiveTabChange={(tab: number) => setSelectedGeneration(tab)}
				>
					<Tabs.Item active={selectedGeneration === 0} title='All' />
					<Tabs.Item active={selectedGeneration === 1} title='Gen I' />
					<Tabs.Item active={selectedGeneration === 2} title='Gen II' />
					<Tabs.Item active={selectedGeneration === 3} title='Gen III' />
					<Tabs.Item active={selectedGeneration === 4} title='Gen IV' />
					<Tabs.Item active={selectedGeneration === 5} title='Gen V' />
					<Tabs.Item active={selectedGeneration === 6} title='Gen VI' />
					<Tabs.Item active={selectedGeneration === 7} title='Gen VII' />
					<Tabs.Item active={selectedGeneration === 8} title='Gen VIII' />
					<Tabs.Item active={selectedGeneration === 9} title='Gen IX' />
				</Tabs>
				<input
					className='mt-2 h-10 rounded-lg border-2 border-gray-300 bg-white px-5 pr-16 text-sm focus:outline-none max-md:mb-4'
					type='text'
					name='search'
					autoComplete='off'
					placeholder='Search'
					value={searchTerm}
					onChange={handleSearch}
				/>
			</div>
			<div className='mx-auto grid w-full grid-cols-2 items-center justify-center gap-6 rounded bg-[#f9f9f9] p-6 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 2xl:grid-cols-12'>
				{searchResults.map((pokemon: pokemon) => (
					<PokeFinderCard
						key={pokemon.id}
						setEnableToast={setEnableToast}
						pokemon={pokemon}
						setPokemonParty={setPokemonParty}
						selectedTeam={selectedTeam}
					/>
				))}
				{isLoading && <LoadingIcon />}
			</div>
		</div>
	);
}
