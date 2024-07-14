import { useState } from 'react';
import { Button, ButtonGroup } from 'flowbite-react';
import PartyIcon from '@/components/icons/PartyIcon';
import ClashIcon from '@/components/icons/ClashIcon';

interface TabberProps {
	leftLabel: string;
	rightLabel: string;
	setGameMode: (mode: string) => void;
}

const Component = ({ leftLabel, rightLabel, setGameMode }: TabberProps) => {
	const [selectedTab, setSelectedTab] = useState('competitive');

	const handleTabClick = (tab: string) => {
		setSelectedTab(tab);
		setGameMode(tab);
	};

	return (
		<div className='mx-4'>
			<ButtonGroup>
				<Button
					color={selectedTab === 'casual' ? 'blue' : 'light'}
					onClick={() => handleTabClick('casual')}
				>
					<PartyIcon className='mr-3' selectedTab={selectedTab} />
					{leftLabel}
				</Button>
				<Button
					color={selectedTab === 'competitive' ? 'blue' : 'light'}
					onClick={() => handleTabClick('competitive')}
				>
					<ClashIcon className='mr-3' selectedTab={selectedTab} />
					{rightLabel}
				</Button>
			</ButtonGroup>
		</div>
	);
};

export default Component;
