import React, { useEffect, useState, useRef, useCallback } from 'react';

interface TeamSelectorProps {
	numTeams: number;
	setSelectedTeam: (team: number) => void;
	onDeleteTeam: (index: number) => void;
	teamNames: string[];
	onTeamNameChange: (index: number, newName: string) => void;
}

const DropdownMenu = ({
	numTeams,
	setSelectedTeam,
	onDeleteTeam,
	teamNames,
	onTeamNameChange,
}: TeamSelectorProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingName, setEditingName] = useState('');
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	const handleSelection = useCallback(
		(index: number) => {
			setIsOpen(false);
			setSelectedTeam(index);
		},
		[setSelectedTeam]
	);

	const toggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	const filterItems = (item: string) => {
		const text = item.toLowerCase();
		return text.includes(searchTerm.toLowerCase());
	};

	const handleDeleteTeam = (event: React.MouseEvent, index: number) => {
		event.stopPropagation();
		onDeleteTeam(index);
	};

	const handleEditClick = (event: React.MouseEvent, index: number) => {
		event.stopPropagation();
		if (editingIndex === index) {
			saveEdit();
		} else {
			setEditingIndex(index);
			setEditingName(teamNames[index]);
		}
	};

	const saveEdit = useCallback(() => {
		if (editingIndex !== null && editingName.trim() !== '') {
			onTeamNameChange(editingIndex, editingName.trim());
			setEditingIndex(null);
			setEditingName('');
		}
	}, [editingIndex, editingName, onTeamNameChange]);

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter') {
			saveEdit();
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				saveEdit();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [saveEdit]);

	return (
		<div className='z-50 flex items-center justify-center max-md:w-[calc(100%-1.5rem)]'>
			<div className='group relative w-full max-w-md' ref={dropdownRef}>
				<button
					id='dropdown-button'
					className='inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-transform duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2 focus:ring-offset-gray-100'
					onClick={toggleDropdown}
				>
					<span className='mr-2'>{teamNames[numTeams - 1]}</span>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						className='-mr-1 ml-2 h-5 w-5'
						viewBox='0 0 20 20'
						fill='currentColor'
						aria-hidden='true'
					>
						<path
							fillRule='evenodd'
							d='M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
							clipRule='evenodd'
						/>
					</svg>
				</button>
				{isOpen && (
					<div className='absolute right-0 mt-2 space-y-1 rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 max-md:w-full'>
						<input
							id='search-input'
							className='block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none'
							type='text'
							placeholder='Search'
							autoComplete='off'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						{teamNames.map((teamName, index) => (
							<div
								key={index}
								className='flex cursor-pointer items-center justify-between gap-2 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100 active:bg-blue-100'
								onClick={() => handleSelection(index)}
								style={{
									display: filterItems(teamName) ? 'flex' : 'none',
								}}
							>
								{editingIndex === index ? (
									<input
										type='text'
										value={editingName}
										onChange={(e) => setEditingName(e.target.value)}
										onClick={(e) => e.stopPropagation()}
										onKeyDown={handleKeyDown}
										className='block w-32 rounded-md border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none'
										autoFocus
									/>
								) : (
									<span className='flex-grow text-nowrap py-2 pl-2 pr-8'>
										{teamName}
									</span>
								)}
								<div className='flex items-center'>
									<button
										onClick={(e) => handleEditClick(e, index)}
										className='mr-2 text-blue-500 hover:text-blue-700'
									>
										<svg
											xmlns='http://www.w3.org/2000/svg'
											className='h-5 w-5'
											viewBox='0 0 20 20'
											fill='currentColor'
										>
											<path d='M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z' />
										</svg>
									</button>
									<button
										onClick={(e) => handleDeleteTeam(e, index)}
										className='text-red-500 hover:text-red-700'
									>
										<svg
											xmlns='http://www.w3.org/2000/svg'
											className='h-5 w-5'
											viewBox='0 0 20 20'
											fill='currentColor'
										>
											<path
												fillRule='evenodd'
												d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
												clipRule='evenodd'
											/>
										</svg>
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default DropdownMenu;
