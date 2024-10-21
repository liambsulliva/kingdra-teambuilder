import ModeTabber from '@/components/ModeTabber';
import TeamSelector from '@/components/TeamSelector';
import { Button } from 'flowbite-react';
import '@/app/globals.css';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

interface HeaderProps {
	setGameMode: (mode: string) => void;
	numTeams: number;
	teamNames: Array<string>;
	setNumTeams: (num: number) => void;
	selectedTeam: number;
	setSelectedTeam: (team: number) => void;
	onNewTeam: () => void;
	onDeleteTeam: (index: number) => void;
	onTeamNameChange: (index: number, newName: string) => void;
}

const Header = ({
	setGameMode,
	numTeams,
	teamNames,
	setSelectedTeam,
	onNewTeam,
	onDeleteTeam,
	onTeamNameChange,
}: HeaderProps) => {
	return (
		<div className='flex flex-col items-center gap-8 p-6 pb-4 md:flex-row md:justify-between'>
			<div className='flex flex-col items-center md:flex-row md:items-center md:gap-10'>
				<div className='flex items-center gap-2'>
					<img src='icon.png' className='h-16' alt='Icon' />
					<h1 className='font-custom select-none text-5xl font-extrabold'>
						Kingdra
					</h1>
				</div>
				<div className='mt-4 flex items-center gap-4 md:mt-0'>
					<SignedOut>
						<Button color='light'>
							<SignInButton />
						</Button>
					</SignedOut>
					<SignedIn>
						<UserButton />
					</SignedIn>
					<ModeTabber
						leftLabel='Casual'
						rightLabel='Competitive'
						setGameMode={setGameMode}
					/>
				</div>
			</div>
			<div className='flex w-full flex-col items-center gap-4 md:w-auto'>
				<TeamSelector
					numTeams={numTeams}
					setSelectedTeam={setSelectedTeam}
					onDeleteTeam={onDeleteTeam}
					teamNames={teamNames}
					onTeamNameChange={onTeamNameChange}
					className='w-full md:w-auto'
				/>
				<Button
					color='light'
					onClick={onNewTeam}
					className='w-full md:mb-0 md:w-auto'
				>
					New Team
				</Button>
			</div>
			{/* Hamburger Menu Here on md: */}
		</div>
	);
};

export default Header;
