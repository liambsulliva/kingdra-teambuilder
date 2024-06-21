"use client"
//import Draggable from 'react-draggable';
import "@/app/globals.css";
import { useAuth } from "@clerk/nextjs";
import axios from 'axios';

interface PokeFinderCardProps {
    pokemon: pokemon;
    setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}

interface pokemon {
    name: string,
    id: number,
    sprite: string
}

const PokeFinderCard: React.FC<PokeFinderCardProps> = ({ pokemon, setPokemonParty }: PokeFinderCardProps) => {
    const { isSignedIn } = useAuth();
    const handleClick = async () => {
        try {
            setPokemonParty((prevPokemonParty: pokemon[]) => {
                if (prevPokemonParty.length >= 6) {
                    return prevPokemonParty;
                } else if (!prevPokemonParty.some(p => p.id === pokemon.id)) {
                    return [...prevPokemonParty, pokemon];
                }
                return prevPokemonParty;
            });
            if (isSignedIn) {
                const response = await axios.post('/api/pokemon-party', {
                    name: pokemon.name,
                    id: pokemon.id,
                    sprite: pokemon.sprite
                });
                // Handle the response here
                if (response.status === 201) {
                    console.log('POST Success');
                } else {
                    console.log('POST Failure');
                }
            }
        } catch (error) {
            // Handle the error here
            console.log('Internal Server Error');
        }
    };

    return (
        <div className="flex flex-col justify-center items-center bg-[#fff] md:h-32 h-44 w-32 rounded shadow cursor-pointer transition-transform duration-100 hover:scale-[1.05] active:scale-[1]" onClick={handleClick}>
            <img className="md:h-24 md:w-24" src={pokemon.sprite} alt={pokemon.name} />
            <p className="text-center">{pokemon.name}</p>
        </div>
    );
}

export default PokeFinderCard;