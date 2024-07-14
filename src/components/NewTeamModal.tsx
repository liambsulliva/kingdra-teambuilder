import React, { useState } from 'react';
import { Modal, Button, Label, TextInput } from 'flowbite-react';

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
			<Modal.Header>Create New Team</Modal.Header>
			<Modal.Body>
				<div className='space-y-6'>
					<div>
						<div className='mb-2 block'>
							<Label htmlFor='teamName' value='Team Name' />
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
			</Modal.Body>
			<Modal.Footer>
				<Button color='blue' onClick={handleConfirm}>
					Create Team
				</Button>
				<Button color='light' onClick={onClose}>
					Cancel
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default NewTeamModal;
