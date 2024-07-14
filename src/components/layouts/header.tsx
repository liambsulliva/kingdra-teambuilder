import ModeTabber from '@/components/ModeTabber';
import TeamSelector from '@/components/TeamSelector';
import { Button } from 'flowbite-react';
import '@/app/globals.css';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

interface HeaderProps {
	setGameMode: (mode: string) => void;
	numTeams: number;
	setNumTeams: (num: number) => void;
	selectedTeam: number;
	setSelectedTeam: (team: number) => void;
	onNewTeam: () => void;
	onDeleteTeam: (index: number) => void;
}

const Header = ({
	setGameMode,
	numTeams,
	setSelectedTeam,
	onNewTeam,
	onDeleteTeam,
}: HeaderProps) => {
	return (
		<div className='flex flex-row items-center justify-between p-6 pb-4 max-md:flex-col max-md:gap-8'>
			<div className='flex flex-row items-center gap-10 max-lg:flex-col'>
				<div className='flex items-center gap-2'>
					<img src='icon.png' className='h-16' />
					<h1 className='font-custom select-none text-5xl font-extrabold'>
						Kingdra
					</h1>
				</div>
				<ModeTabber
					leftLabel={'Casual'}
					rightLabel={'Competitive'}
					setGameMode={setGameMode}
				/>
			</div>
			<div className='flex flex-row gap-6 px-6'>
				<Button color='light' onClick={onNewTeam}>
					New Team
				</Button>
				<TeamSelector
					numTeams={numTeams}
					setSelectedTeam={setSelectedTeam}
					onDeleteTeam={onDeleteTeam}
				/>
				<SignedOut>
					<Button color='light'>
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
};

export default Header;
