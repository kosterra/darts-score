import {
    getHeaders
} from '../utils/service.utils';

const API_URL = '/api/';

// Public methods to export
const createATCEntry = async (atc) => {
    try {
        const response = await fetch(API_URL + 'training/atc', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(atc)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw new Error(error);
    }
}

const loadATCEntries = async (mode) => {
    try {
        let queryString = mode ? '?mode=' + mode : '';
        const response = await fetch(API_URL + 'training/atc' + queryString, {
            method: 'GET',
            headers: getHeaders(false)
        });
            
        if (!response.ok) {
            throw Error(response.statusText);
        };

        return await response.json();
    } catch (error) {
        throw new Error(error);
    }
}

const deleteATCEntry = async (entryId) => {
    try {
        const response = await fetch(API_URL + 'training/atc/' + entryId, {
            method: 'DELETE',
            headers: getHeaders(false)
        });

        if (!response.ok) {
            throw Error(response.statusText);
        };

        return response.ok;
    } catch (error) {
        throw Error(error.message);
    }
}

// Export methods
const ATCService = {
    createATCEntry,
    loadATCEntries,
    deleteATCEntry
}

export default ATCService;