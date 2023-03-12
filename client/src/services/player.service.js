// Public methods to export
const createPlayer = (player) => {
    var formData = new FormData();
    Object.keys(player).forEach(key => formData.append(key, player[key]));

    return fetch(process.env.REACT_APP_API_URL + 'players', {
        method: 'POST',
        body: formData
    }).then(response => {
        console.log(response);
        console.log(response.ok);
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