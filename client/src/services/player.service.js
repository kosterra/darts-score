import playerModel from '../models/player.model';

// Public methods to export
const createPlayer = async function(name) {
    fetch(playerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify({
            playerModel
        })
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        }
    }).catch(error => {
        console.log("Failed to donate! " + error.message);
    });
}

const updatePlayer = async function(name, playerData) {
    const data = await readData();
    data[name] = playerData;
    await writeData(data);
}

const getAllPlayers = async function() {
    const data = await readData();
    let playersName = Object.keys(data);
    return playersName;
}

const getSinglePlayerData = async function(playerName) {
    const data = await readData();
    return data[playerName];
}

// Export methods
const playerService = {
    createPlayer,
    updatePlayer,
    getAllPlayers,
    getSinglePlayerData
}

export default playerService