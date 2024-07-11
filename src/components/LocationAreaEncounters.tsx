import { useState, useEffect } from 'react';
import LoadingIcon from '@/components/LoadingIcon';
import axios from 'axios';
import { FaGamepad } from 'react-icons/fa';

const LocationAreaEncounters = ({ url }: { url: string }) => {
	const [encounters, setEncounters] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchEncounters = async () => {
			try {
				const response = await axios.get(url);
				setEncounters(response.data);
				setLoading(false);
			} catch (err) {
				setError('Failed to fetch encounter data');
				console.error(err);
				setLoading(false);
			}
		};

		fetchEncounters();
	}, [url]);

	const formatName = (name: string) => {
		return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	};

	if (loading) return <LoadingIcon />;
	if (error) return <p>{error}</p>;

	return (
		<div className='grid h-[38rem] grid-cols-2 gap-4 overflow-y-auto'>
			{encounters.length > 0 ? (
				encounters.map(
					(
						encounter: {
							location_area: { name: string };
							version_details: {
								version: { name: string };
								max_chance: number;
							}[];
						},
						index
					) => (
						<div
							key={index}
							className='rounded-lg border border-gray-300 p-4 shadow-sm'
						>
							<h4 className='mb-2 text-lg font-bold'>
								{formatName(encounter.location_area.name)}
							</h4>
							{encounter.version_details.map((versionDetail, index) => (
								<div key={index} className='mb-2 flex items-center'>
									<FaGamepad className='mr-2 text-gray-600' />
									<div>
										<p className='font-semibold'>
											{formatName(versionDetail.version.name)}
										</p>
										<p className='text-sm text-gray-600'>
											{versionDetail.max_chance}% chance
										</p>
									</div>
								</div>
							))}
						</div>
					)
				)
			) : (
				<p>No encounter data available for this Pokémon.</p>
			)}
		</div>
	);
};

export default LocationAreaEncounters;