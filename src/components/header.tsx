import ModeTabber from "@/components/ModeTabber";
import TeamSelector from "./TeamSelector";
import { Button } from "flowbite-react";
import "@/app/globals.css";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

interface HeaderProps {
  numTeams: number;
  setNumTeams: (num: number) => void;
  selectedTeam: number;
  setSelectedTeam: (team: number) => void;
}

export default function Header({
  numTeams,
  setNumTeams,
  selectedTeam,
  setSelectedTeam,
}: HeaderProps) {
  const handleNewTeam = () => {
    setNumTeams(numTeams + 1);
    setSelectedTeam(numTeams);
  };

  return (
    <div className="p-8 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-8 items-center'>
          <h1 className="text-5xl font-extrabold font-custom max-md:hidden select-none">Kingdra</h1>
          <img src="icon.png" className="md:hidden h-16" />
          <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
        </div>
        <div className='flex flex-row gap-6 px-6 max-md:hidden'>
          <Button color="light" /*onClick={handleNewTeam}*/ disabled>New Team</Button>
          {/*<TeamSelector numTeams={numTeams} setSelectedTeam={setSelectedTeam} />*/}
          <SignedOut>
            <Button color="light"><SignInButton /></Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        {/* Hamburger Menu Here on md: */}
      </div>
  );
}
