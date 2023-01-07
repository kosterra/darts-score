import {toast} from 'react-toastify';

// Public methods to export
const createPlayer = (player) => {
    return fetch(process.env.REACT_APP_API_URL + 'players', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(player)
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        } else {
            toast.success('New Player created successfully.');
        }
        return response.ok;
    }).catch(error => {
        toast.error('Failed to create new Player. ' + error.message);
    });
}

const loadPlayers = (searchTerm) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/search?search=' + (searchTerm ? searchTerm : ''))
        .then(response => response.json())
        .then(data => {
            return data;
        }).catch(error => {
            toast.error('Failed to load players. ' + error.message);
        });
}

// Export methods
const PlayerService = {
    createPlayer,
    loadPlayers
}

export default PlayerService