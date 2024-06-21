"use client"

import "@/app/globals.css";
import { useEffect, useState, useCallback } from "react";
import PokeFinderCard from "./PokeFinderCard";

interface pokemon {
    name: string,
    id: number,
    sprite: string
}

export default function PokeFinder({ setPokemonParty }: { setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>> }) {
    const [pokemonData, setPokemonData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/pokemon?page=${currentPage}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(data);
            setPokemonData((prevData: any) => [...prevData, ...data.pokemonData.map((pokemon: any) => {
                const formattedName = pokemon.name
                    .split('-')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('-');
                return { ...pokemon, name: formattedName };
            })]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage]);

    const handleScroll = useCallback(() => {
        const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight;
        if (isAtBottom) {
            setCurrentPage((prevPage) => prevPage + 1);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll]);

    return (
        <div className="grid 2xl:grid-cols-12 xl:grid-cols-9 lg:grid-cols-6 sm:grid-cols-4 grid-cols-2 gap-6 mx-auto bg-[#f9f9f9] p-6 justify-center items-center rounded">
            {isLoading && pokemonData.length === 0 ? (
                <div>Loading...</div>
            ) : (
                <>
                    {pokemonData.map((pokemon: any) => (
                        <PokeFinderCard key={pokemon.id} pokemon={pokemon} setPokemonParty={setPokemonParty} />
                    ))}
                </>
            )}
        </div>
    );
}
