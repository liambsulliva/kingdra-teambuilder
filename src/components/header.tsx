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
    <div className="px-4 pt-4 flex flex-row justify-between items-start">
      <div className="flex flex-row">
        <img src="banner.png" className="max-md:hidden select-none h-28" />
        <img src="icon.png" className="md:hidden h-24" />
        <div className="max-md:hidden py-5">
          <ModeTabber leftLabel={"Casual"} rightLabel={"Competitive"} />
        </div>
      </div>
      <div className="flex flex-row gap-6 px-6 py-5">
        <Button
          className="max-md:hidden"
          color="gray"
          title="Coming Soon!"
          /*onClick={handleNewTeam}*/ disabled 
        >
          New Team
        </Button>
        {/*<TeamSelector numTeams={numTeams} setSelectedTeam={setSelectedTeam} />*/}
        <SignedOut>
          <Button color="gray">
            <SignInButton />
          </Button>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
      {/* Hamburger Menu Here on md: */}
    </div>
  );
}
