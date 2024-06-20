"use client"
//import Draggable from 'react-draggable';
import "@/app/globals.css";
import axios from 'axios';

interface PokeFinderCard {
    pokemon: {
        sprite: string;
        name: string;
        id: string
    };
}

export default function PokeFinderCard({ pokemon }: PokeFinderCard) {
    const handleClick = async () => {
        try {
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