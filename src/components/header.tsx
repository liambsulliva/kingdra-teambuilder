import ModeTabber from "@/components/ModeTabber";
import TeamSelector from "./TeamSelector";
import PokeballLogo from "./PokeballLogo";
import { Button } from 'flowbite-react';
import "@/app/globals.css";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';

interface HeaderProps {
  numTeams: number;
  setNumTeams: (num: number) => void;
  selectedTeam: number;
  setSelectedTeam: (team: number) => void;
}

export default function Header({ numTeams, setNumTeams, selectedTeam, setSelectedTeam }: HeaderProps) {
    const handleNewTeam = () => {
      setNumTeams(numTeams + 1);
      setSelectedTeam(numTeams);
    };

    return (
      <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-4 items-center'>
          <h1 className="text-3xl font-semibold font-custom max-md:hidden select-none">Pokémon Teambuilder</h1>
          <PokeballLogo className="md:hidden" />
          <div className="max-md:hidden">
            <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
          </div>
        </div>
        <div className='flex flex-row gap-6 px-6'>
          <Button className="max-md:hidden" color="gray" /*onClick={handleNewTeam}*/ disabled>New Team</Button>
          {/*<TeamSelector numTeams={numTeams} setSelectedTeam={setSelectedTeam} />*/}
          <SignedOut>
            <Button color="gray"><SignInButton /></Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        {/* Hamburger Menu Here on md: */}
      </div>
    );
}