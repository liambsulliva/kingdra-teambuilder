import { useState } from 'react';
import { Button, ButtonGroup } from 'flowbite-react';
import PartyIcon from './PartyIcon';
import ClashIcon from './ClashIcon';

interface TabberProps {
	leftLabel: string;
	rightLabel: string;
	setGameMode: (mode: string) => void;
}

export default function Component({
	leftLabel,
	rightLabel,
	setGameMode,
}: TabberProps) {
	const [selectedTab, setSelectedTab] = useState('right');

	const handleTabClick = (tab: string) => {
		setSelectedTab(tab);
		setGameMode(tab);
	};

	return (
		<div className='mx-4 max-lg:hidden'>
			<ButtonGroup>
				<Button
					color={selectedTab === 'left' ? 'blue' : 'light'}
					onClick={() => handleTabClick('left')}
				>
					<PartyIcon className='mr-3' selectedTab={selectedTab} />
					{leftLabel}
				</Button>
				<Button
					color={selectedTab === 'right' ? 'blue' : 'light'}
					onClick={() => handleTabClick('right')}
				>
					<ClashIcon className='mr-3' selectedTab={selectedTab} />
					{rightLabel}
				</Button>
			</ButtonGroup>
		</div>
	);
}
