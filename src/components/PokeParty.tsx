import PokeSlot from "@/components/PokeSlot";
import IETabber from "@/components/IETabber";
import "@/app/globals.css";

interface pokemon {
    name: string,
    id: number,
    sprite: string
}

export default function PokeParty({ pokemonParty, setPokemonParty, setSelectedPokemon }: { pokemonParty: pokemon[], setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>, setSelectedPokemon: React.Dispatch<React.SetStateAction<pokemon>> }) {
    return (
        <div className="flex flex-col items-center py-4">
            <div className="p-6 grid md:grid-cols-2 grid-cols-3 gap-4">
                {pokemonParty.map((pokemon) => (
                    <PokeSlot key={pokemon.id} pokemon={pokemon} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
                ))}
                {Array(Math.max(0, 6 - pokemonParty.length)).fill(
                    <PokeSlot pokemon={null} setPokemonParty={setPokemonParty} setSelectedPokemon={setSelectedPokemon} />
                )}
            </div>
            <div>
                <IETabber leftLabel={"Import"} rightLabel={"Export"} />
            </div>
        </div>
    );
}