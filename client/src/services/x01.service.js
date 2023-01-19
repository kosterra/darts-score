import { toast } from 'react-toastify';

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
            toast.error('Error on create game! ' + response.statusText);
            throw Error(response.statusText);
        } else {
            return response.json();
        }
    }).then((data) => {
        return data;
    }).catch(error => {
        toast.error('Failed to create new X01 game. ' + error.message);
    });
}

const loadX01 = (id) => {
    return fetch(process.env.REACT_APP_API_URL + 'games/x01/' + id)
        .then(response => response.json())
        .then(data => {
            return data;
        }).catch(error => {
            toast.error('Failed to load X01 game. ' + error.message);
        });
}

// Export methods
const X01Service = {
    createX01,
    loadX01
}

export default X01Service;