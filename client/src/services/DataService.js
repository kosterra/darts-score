import dataModels from '../models/dataModels';

// Public methods to export
const createPlayer = async function(name) {
  const data = await readData();
  data[name] = dataModels.playerModel;
  data[name].name = name;
  await writeData(data);
}

const updatePlayer = async function(name, playerData) {
  const data = await readData();
  data[name] = playerData;
  await writeData(data);
}

const getAllPlayersName = async function() {
  const data = await readData();
  let playersName = Object.keys(data);
  return playersName;
}

const getSinglePlayerData = async function(playerName) {
  const data = await readData();
  return data[playerName];
}


// API calls - no export
const readData = async () => {
    const response = await fetch('/api/v1/data', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    })
    return response.json();
}

const writeData = async (data) => {
    const response = await fetch(`/api/v1/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw Error("Error");
    }
    return await response.json();
}

// Export methods
const dataService = {
    createPlayer,
    updatePlayer,
    getAllPlayersName,
    getSinglePlayerData
}
  
export default dataService