import React, { useState } from 'react';
import {
	Modal,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Button,
	Label,
	TextInput,
} from 'flowbite-react';

interface NewTeamModalProps {
	show: boolean;
	onClose: () => void;
	onConfirm: (teamName: string) => void;
}

const NewTeamModal: React.FC<NewTeamModalProps> = ({
	show,
	onClose,
	onConfirm,
}) => {
	const [teamName, setTeamName] = useState('');

	const handleConfirm = () => {
		if (teamName.trim()) {
			onConfirm(teamName.trim());
			setTeamName('');
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleConfirm();
		}
	};

	return (
		<Modal show={show} onClose={onClose} dismissible>
			<ModalHeader>Create New Team</ModalHeader>
			<ModalBody>
				<div className='space-y-6'>
					<div>
						<div className='mb-2 block'>
							<Label htmlFor='teamName'>Team Name</Label>
						</div>
						<TextInput
							id='teamName'
							placeholder='Enter team name'
							value={teamName}
							onChange={(e) => setTeamName(e.target.value)}
							onKeyDown={handleKeyDown}
							required
						/>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<Button color='blue' onClick={handleConfirm}>
					Create Team
				</Button>
				<Button color='light' onClick={onClose}>
					Cancel
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default NewTeamModal;
