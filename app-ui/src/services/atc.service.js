import { translateAnswer } from '../utils/i18n';
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

        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error);
    }
}

// scoring: 'Time' or 'Darts'; without it both
const loadATCEntries = async (mode, scoring) => {
    try {
        const params = new URLSearchParams({ ...(mode && { mode }), ...(scoring && { scoring }) }).toString();
        const queryString = params ? '?' + params : '';
        const response = await fetch(API_URL + 'training/atc' + queryString, {
            method: 'GET',
            headers: getHeaders(false)
        });
            
        if (!response.ok) {
            throw Error(response.statusText);
        };

        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error);
    }
}

const deleteATCEntry = async (entryId, clubId) => {
    try {
        const response = await fetch(API_URL + 'training/atc/' + entryId, {
            method: 'DELETE',
            headers: getHeaders(false, clubId)
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