import "@/app/globals.css";
import PokeFinderCard from "./PokeFinderCard";

export default function PokeFinder() {
    return (
        <div className="grid 2xl:grid-cols-12 xl:grid-cols-9 lg:grid-cols-6 sm:grid-cols-3 grid-cols-2 gap-6 bg-[#f9f9f9] p-6 justify-center items-center rounded">
            {Array(36).fill(<PokeFinderCard />)}
        </div>
    );
}