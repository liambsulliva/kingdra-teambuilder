"use client";
import "@/app/globals.css";
import { useEffect, useState, useCallback } from "react";
import PokeFinderCard from "./PokeFinderCard";
import LoadingIcon from "./LoadingIcon";
import type { pokemon } from "../../lib/pokemonInterface";
import { Tabs } from "flowbite-react";

export default function PokeFinder({
  setPokemonParty,
  setEnableToast
}: {
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
  setEnableToast: React.Dispatch<React.SetStateAction<{ enabled: boolean, message: string }>>;
}) {
  const [pokemonData, setPokemonData] = useState<pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResults, setSearchResults] = useState<pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      const response = await fetch(`/api/pokemon?page=${currentPage}&generation=${selectedGeneration}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      const newPokemonData = data.pokemonData.map((pokemon: pokemon) => ({
        ...pokemon,
        name: pokemon.name
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("-")
      }));
      setPokemonData((prevData: pokemon[]) => 
        currentPage === 1 ? newPokemonData : [...prevData, ...newPokemonData]
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedGeneration]);

  const handleScroll = useCallback(() => {
    const isAtBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (isAtBottom && !isLoading) {
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
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <div className="flex flex-col">
      <div className="w-full px-4 flex md:flex-row flex-col md:justify-between justify-center relative text-gray-600">
        <Tabs 
          aria-label="Tabs with underline" 
          onActiveTabChange={(tab: any) => setSelectedGeneration(parseInt(tab))}
        >
          <Tabs.Item active={selectedGeneration === 0} title="All" />
          <Tabs.Item active={selectedGeneration === 1} title="Gen I" />
          <Tabs.Item active={selectedGeneration === 2} title="Gen II" />
          <Tabs.Item active={selectedGeneration === 3} title="Gen III" />
          <Tabs.Item active={selectedGeneration === 4} title="Gen IV" />
          <Tabs.Item active={selectedGeneration === 5} title="Gen V" />
          <Tabs.Item active={selectedGeneration === 6} title="Gen VI" />
          <Tabs.Item active={selectedGeneration === 7} title="Gen VII" />
          <Tabs.Item active={selectedGeneration === 8} title="Gen VIII" />
          <Tabs.Item active={selectedGeneration === 9} title="Gen IX" />
        </Tabs>
        <input
          className="border-2 max-md:mb-4 border-gray-300 bg-white h-10 px-5 pr-16 mt-2 rounded-lg text-sm focus:outline-none"
          type="text"
          name="search"
          placeholder="Search"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      <div className="w-full grid 2xl:grid-cols-12 xl:grid-cols-9 lg:grid-cols-6 sm:grid-cols-4 grid-cols-2 gap-6 mx-auto bg-[#f9f9f9] p-6 justify-center items-center rounded">
        {searchResults.map((pokemon: pokemon) => (
          <PokeFinderCard
            key={pokemon.id}
            setEnableToast={setEnableToast}
            pokemon={pokemon}
            setPokemonParty={setPokemonParty}
          />
        ))}
        {isLoading && <LoadingIcon />}
      </div>
    </div>
  );
}