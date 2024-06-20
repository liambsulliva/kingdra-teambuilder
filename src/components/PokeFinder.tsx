"use client"

import "@/app/globals.css";
import { useEffect, useState, useCallback } from "react";
import PokeFinderCard from "./PokeFinderCard";

export default function PokeFinder() {
    const [pokemonData, setPokemonData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/get-pokemon?page=${currentPage}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(data);
            setPokemonData((prevData: any) => [...prevData, ...data.pokemonData]);
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
        <div className="grid 2xl:grid-cols-12 xl:grid-cols-9 lg:grid-cols-6 sm:grid-cols-3 grid-cols-2 gap-6 bg-[#f9f9f9] p-6 justify-center items-center rounded">
            {isLoading && pokemonData.length === 0 ? (
                <div>Loading...</div>
            ) : (
                <>
                    {pokemonData.map((pokemon: any) => (
                        <PokeFinderCard key={pokemon.id} pokemon={pokemon} />
                    ))}
                </>
            )}
        </div>
    );
}
