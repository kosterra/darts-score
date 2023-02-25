// Public methods to export
const createX01 = (game) => {
    return fetch(process.env.REACT_APP_API_URL + 'games/x01', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(game)
    }).then(response => {    
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response.json();
    }).then((data) => {
        return data;
    }).catch(error => {
        throw new Error(error);
    });
}

const loadRunningX01Games = async () => {
    let data = await loadAllX01Games();
    return data.filter(game => game.gameIsRunning).sort((a,b)=>{
        return new Date(a.updatedAt) - new Date(b.updatedAt);
    });
}

const loadFinishedX01Games = async () => {
    let data = await loadAllX01Games();
    return data.filter(game => !game.gameIsRunning).sort((a,b)=>{
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

const loadAllX01Games = () => {
    return fetch(process.env.REACT_APP_API_URL + 'games/x01')
        .then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        }).then(data => {
            return data;
        }).catch(error => {
            throw new Error(error);
        });
}

const loadX01 = (id) => {
    return fetch(process.env.REACT_APP_API_URL + 'games/x01/' + id)
        .then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        }).then(data => {
            return data;
        }).catch(error => {
            throw new Error(error);
        });
}

const updateX01 = (game) => {
    return fetch(process.env.REACT_APP_API_URL + 'games/x01/' + game.id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(game)
    }).then(response => {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response.ok;
    }).catch(error => {
        throw new Error(error);
    });
}

// Export methods
const X01Service = {
    createX01,
    loadRunningX01Games,
    loadFinishedX01Games,
    loadX01,
    updateX01
}

export default X01Service;