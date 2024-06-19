import PokeSlot from "@/components/PokeSlot";
import "@/app/globals.css";

export default function PokeParty() {
    return (
      <div className="p-6 flex flex-col justify-between items-center gap-4">
        <PokeSlot />
        <PokeSlot />
        <PokeSlot />
        <PokeSlot />
        <PokeSlot />
        <PokeSlot />
      </div>
    );
}