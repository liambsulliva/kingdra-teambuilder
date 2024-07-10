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
  onNewTeam: () => void;
}

export default function Header({
  numTeams,
  setNumTeams,
  selectedTeam,
  setSelectedTeam,
  onNewTeam
}: HeaderProps) {
  const handleNewTeam = () => {
    setNumTeams(numTeams + 1);
    setSelectedTeam(numTeams);
  };

  return (
    <div className="p-6 pb-4 flex flex-row justify-between items-center">
        <div className='flex flex-row gap-10 items-center'>
          <div className="flex items-center gap-2">
            <img src="icon.png" className="h-16" />
            <h1 className="text-5xl font-extrabold font-custom max-md:hidden select-none">Kingdra</h1>
          </div>
          <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
        </div>
        <div className='flex flex-row gap-6 px-6'>
          <Button className="max-lg:hidden" color="light" onClick={onNewTeam}>New Team</Button>
          <TeamSelector numTeams={numTeams} setSelectedTeam={setSelectedTeam} />
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
