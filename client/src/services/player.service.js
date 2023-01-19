import { toast } from 'react-toastify';

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

const getPlayer = (playerId) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/' + playerId)
        .then(response => response.json())
        .then(data => {
            return data;
        }).catch(error => {
            toast.error('Failed to load player with id ' + playerId + '. ' + error.message);
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

const updatePlayer = (player) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/' + player.id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(player)
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        } else {
            toast.success('Player updated successfully.');
        }
        return response.ok;
    }).catch(error => {
        toast.error('Failed to update Player with id ' + player.id + '. ' + error.message);
    });
}

const deletePlayer = (playerId) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/' + playerId, {
        method: 'DELETE'
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        } else {
            toast.success('Player successfully deleted.');
        }
        return response.ok;
    }).catch(error => {
        toast.error('Failed to delete Player with id ' + playerId + '. ' + error.message);
    });
}

// Export methods
const PlayerService = {
    createPlayer,
    getPlayer,
    loadPlayers,
    updatePlayer,
    deletePlayer
}

export default PlayerService