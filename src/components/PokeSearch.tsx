import "@/app/globals.css";

interface pokemon {
    name: string,
    id: number,
    sprite: string
}

interface PokeSearchProps {
    pokemonData: any;
    setPokemonData: React.Dispatch<React.SetStateAction<any>>;
}

export default function PokeSearch(props: PokeSearchProps) {
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredPokemon = props.pokemonData.filter((pokemon: pokemon) => pokemon.name.toLowerCase().includes(searchTerm));
        props.setPokemonData(filteredPokemon);
    };

    return (
        <div className="w-full flex md:justify-end justify-center pt-2 relative text-gray-600">
            <input className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="search" name="search" placeholder="Search" onChange={handleSearch} />
        </div>
    );
}