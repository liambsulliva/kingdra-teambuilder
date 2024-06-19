import ModeTabber from "@/components/ModeTabber";
import TeamSelector from "./TeamSelector";
import PokeballLogo from "./PokeballLogo";
import PartyIcon from "./PartyIcon";
import ClashIcon from "./ClashIcon";
import { Button } from 'flowbite-react';
import "@/app/globals.css";

export default function Header() {
    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-4 items-center'>
          <h1 className="text-3xl font-semibold font-custom max-md:hidden">Pokémon Teambuilder</h1>
          <PokeballLogo className="md:hidden" />
          <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
        </div>
        <div className='flex flex-row gap-4'>
          <TeamSelector />
          <Button color="gray" href='/signin'>Account</Button>
          <Button color="gray" href='' disabled>Settings</Button>
        </div>
      </div>
    );
}