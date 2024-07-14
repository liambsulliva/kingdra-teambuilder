import axios from 'axios';

export const fetchTeamNames = async () => {
	try {
		const response = await axios.get('/api/pokemon-teams');
		return response.data.teamNames;
	} catch (error) {
		console.error('Error fetching team names:', error);
		throw error;
	}
};

export const updateTeamNames = async (teamNames: string[]) => {
	try {
		await axios.post('/api/pokemon-teams', { teamNames });
	} catch (error) {
		console.error('Error updating team names:', error);
		throw error;
	}
};
