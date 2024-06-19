import "@/app/globals.css";
import PokeFinderCard from "./PokeFinderCard";

export default function PokeFinder() {
    return (
        <div className="grid grid-cols-9 gap-6 bg-[#f9f9f9] p-6 justify-center items-center rounded">
            {Array(18).fill(<PokeFinderCard />)}
        </div>
    );
}