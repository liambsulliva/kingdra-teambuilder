"use client"
//import Draggable from 'react-draggable';
import "@/app/globals.css";
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
    const handleClick = async () => {
        try {
            setPokemonParty((prevPokemonParty: pokemon[]) => [...prevPokemonParty, pokemon]);
            const response = await axios.post('/api/pokemon-party', {
                name: pokemon.name,
                sprite: pokemon.sprite
            });
            // Handle the response here
            if (response.status === 201) {
                console.log('POST Success');
            } else {
                console.log('POST Failure');
            }
        } catch (error) {
            // Handle the error here
            console.log('Internal Server Error');
        }
    };

    return (
        <div className="flex flex-col justify-center items-center bg-[#fff] h-32 w-32 rounded shadow cursor-pointer" onClick={handleClick}>
            <img src={pokemon.sprite} alt={pokemon.name} />
            <p>{pokemon.name}</p>
        </div>
    );
}

export default PokeFinderCard;