'use client';
import '@/app/globals.css';
import { useEffect, useState, useCallback, useMemo } from 'react';
import PokeFinderCard from './PokeFinderCard';
import LoadingIcon from './LoadingIcon';
import type { pokemon } from '../../lib/pokemonInterface';
import { Tabs, Dropdown } from 'flowbite-react';

const PokeFinder = ({
	gameMode,
	setPokemonParty,
	setEnableToast,
	selectedTeam,
}: {
	gameMode: string;
	setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[][]>>;
	setEnableToast: React.Dispatch<
		React.SetStateAction<{ enabled: boolean; type: string; message: string }>
	>;
	selectedTeam: number;
}) => {
	const [pokemonData, setPokemonData] = useState<pokemon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedGeneration, setSelectedGeneration] = useState(0);
	const [selectedTier, setSelectedTier] = useState('OU');
	const [selectedGen, setSelectedGen] = useState(9); // Default to the latest generation

	const handleSearch = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(event.target.value.toLowerCase());
		},
		[]
	);

	const searchResults = useMemo(
		() =>
			pokemonData.filter((pokemon: pokemon) =>
				pokemon.name.toLowerCase().includes(searchTerm)
			),
		[searchTerm, pokemonData]
	);

	const fetchData = useCallback(async () => {
		try {
			setIsLoading(true);
			let url;
			if (gameMode === 'competitive') {
				url = `/api/pokemon-smogon?tier=${selectedTier}&gen=${selectedGen}`;
			} else {
				url = `/api/pokemon?page=${currentPage}&generation=${selectedGeneration}`;
			}
			const response = await fetch(url);
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
				message: `Failed to fetch pokemon data from server.`,
			});
		} finally {
			setIsLoading(false);
		}
	}, [
		currentPage,
		selectedGeneration,
		selectedTier,
		selectedGen,
		gameMode,
		setEnableToast,
	]);

	const handleScroll = useCallback(() => {
		if (
			gameMode !== 'competitive' &&
			window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
			!isLoading
		) {
			setCurrentPage((prevPage) => prevPage + 1);
		}
	}, [isLoading, gameMode]);

	useEffect(() => {
		setCurrentPage(1);
		setPokemonData([]);
	}, [selectedGeneration, selectedTier, selectedGen, gameMode]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [handleScroll]);

	const renderTabs = useMemo(() => {
		const tabTitles =
			gameMode === 'competitive'
				? ['Ubers', 'OU', 'UU', 'RU', 'NU', 'PU', 'ZU']
				: [
						'All',
						...Array(9)
							.fill(0)
							.map((_, i) => `Gen ${i + 1}`),
					];

		return (
			<Tabs
				aria-label='Tabs with underline'
				onActiveTabChange={(tab: number) => {
					if (gameMode === 'competitive') {
						setSelectedTier(tabTitles[tab]);
					} else {
						setSelectedGeneration(tab);
					}
				}}
			>
				{tabTitles.map((title, index) => (
					<Tabs.Item
						key={index}
						active={
							(gameMode === 'competitive'
								? selectedTier
								: selectedGeneration) ===
							(gameMode === 'competitive' ? title : index)
						}
						title={title}
					/>
				))}
			</Tabs>
		);
	}, [selectedGeneration, selectedTier, gameMode]);

	const handleGenChange = (gen: number) => {
		setSelectedGen(gen);
		setCurrentPage(1);
		setPokemonData([]);
	};

	return (
		<div className='flex flex-col'>
			<div className='relative flex w-full flex-col justify-center px-4 text-gray-600 md:flex-row md:justify-between'>
				<div className='flex items-start gap-4 max-lg:flex-col'>
					{gameMode === 'competitive' && (
						<div className='mt-2'>
							<Dropdown color='light' label={`Gen ${selectedGen}`}>
								{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
									<Dropdown.Item key={gen} onClick={() => handleGenChange(gen)}>
										Gen {gen}
									</Dropdown.Item>
								))}
							</Dropdown>
						</div>
					)}
					{renderTabs}
				</div>
				<div className='flex items-center gap-4 md:mb-8'>
					{gameMode === 'competitive' && (
						<p className='text-sm text-gray-500 max-lg:hidden'>
							Scrapes are very error-prone. Check{' '}
							<a
								className='hover:underline'
								href='https://smogon.com'
								target='_blank'
								rel='noreferrer'
							>
								Smogon
							</a>{' '}
							for the most accurate tiering.
						</p>
					)}
					<input
						className='h-10 rounded-lg border-2 border-gray-300 bg-white px-5 pr-16 text-sm focus:outline-none max-md:mb-4'
						type='text'
						name='search'
						autoComplete='off'
						placeholder='Search'
						value={searchTerm}
						onChange={handleSearch}
					/>
				</div>
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
};

export default PokeFinder;
