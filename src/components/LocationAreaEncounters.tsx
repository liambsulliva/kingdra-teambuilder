import { useState, useEffect } from 'react';
import LoadingIcon from '@/components/LoadingIcon';
import axios from 'axios';

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

	if (loading) return <LoadingIcon />;
	if (error) return <p>{error}</p>;

	return (
		<div className='max-h-96 overflow-y-auto'>
			{encounters.length > 0 ? (
				encounters.map(
					(
						encounter: {
							location_area: { name: string };
							version_details: {
								version: { name: string; max_chance: number };
							}[];
						},
						index
					) => (
						<div key={index} className='mb-4'>
							<h4 className='font-bold'>
								{encounter.location_area.name.replace(/-/g, ' ')}
							</h4>
							<ul>
								{encounter.version_details.map((versionDetail, index) => (
									<li key={index}>
										{versionDetail.version.name}:{' '}
										{versionDetail.version.max_chance}% chance
									</li>
								))}
							</ul>
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
