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
        }
        return response.ok;
    }).catch(error => {
        throw Error(error);
    });
}

const getPlayer = (playerId) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/' + playerId)
        .then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        }).then(data => {
            return data;
        }).catch(error => {
            throw Error(error);
        });
}

const loadPlayers = (searchTerm) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/search?search=' + (searchTerm ? searchTerm : ''))
        .then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        }).then(data => {
            return data;
        }).catch(error => {
            throw Error(error);
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
        }
        return response.ok;
    }).catch(error => {
        throw Error(error);
    });
}

const deletePlayer = (playerId) => {
    return fetch(process.env.REACT_APP_API_URL + 'players/' + playerId, {
        method: 'DELETE'
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response.ok;
    }).catch(error => {
        throw Error(error);
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