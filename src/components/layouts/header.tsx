import { useState } from 'react';
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
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		setIsMenuOpen((prev) => !prev);
	};

	return (
		<div className='relative flex items-center justify-between bg-white p-6 pb-4'>
			<div className='flex items-center gap-4'>
				{/* Hamburger Menu Button - Mobile */}
				<div className='mr-4 md:hidden'>
					<button
						onClick={toggleMenu}
						className='text-2xl focus:outline-none'
						aria-label='Toggle Menu'
					>
						☰
					</button>
				</div>
				<img src='icon.png' alt='Logo' className='h-16' />
				<h1 className='font-custom select-none text-5xl font-extrabold'>
					Kingdra
				</h1>
			</div>
			{/* Desktop Menu */}
			<div className='hidden items-center gap-6 md:flex'>
				<ModeTabber
					leftLabel={'Casual'}
					rightLabel={'Competitive'}
					setGameMode={setGameMode}
				/>
				<Button color='light' onClick={onNewTeam}>
					New Team
				</Button>
				<TeamSelector
					numTeams={numTeams}
					setSelectedTeam={setSelectedTeam}
					onDeleteTeam={onDeleteTeam}
					teamNames={teamNames}
					onTeamNameChange={onTeamNameChange}
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
			{/* Mobile Menu Overlay */}
			<div
				className={`fixed left-0 top-0 z-50 h-full w-3/4 transform bg-white shadow-lg ${
					isMenuOpen ? 'translate-x-0' : '-translate-x-full'
				} transition-transform duration-300 ease-out`}
			>
				<div className='flex flex-col space-y-4 p-6'>
					{/* Close Button */}
					<button
						onClick={toggleMenu}
						className='self-end text-2xl focus:outline-none'
						aria-label='Close Menu'
					>
						×
					</button>
					<ModeTabber
						leftLabel={'Casual'}
						rightLabel={'Competitive'}
						setGameMode={setGameMode}
					/>
					<Button
						color='light'
						onClick={() => {
							onNewTeam();
							toggleMenu();
						}}
					>
						New Team
					</Button>
					<TeamSelector
						numTeams={numTeams}
						setSelectedTeam={setSelectedTeam}
						onDeleteTeam={onDeleteTeam}
						teamNames={teamNames}
						onTeamNameChange={onTeamNameChange}
					/>
					<SignedOut>
						<Button color='light' onClick={toggleMenu}>
							<SignInButton />
						</Button>
					</SignedOut>
					<SignedIn>
						<UserButton />
					</SignedIn>
				</div>
			</div>
			{/* Overlay Background */}
			{isMenuOpen && (
				<div
					className='fixed inset-0 bg-black opacity-50'
					onClick={toggleMenu}
					aria-hidden='true'
				></div>
			)}
		</div>
	);
};

export default Header;
