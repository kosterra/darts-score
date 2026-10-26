import { translateAnswer } from '../utils/i18n';
import { getHeaders, requestJSON } from '../utils/service.utils';

const API_URL = '/api/';

/**
 * Create a new player. Accepts a pre-built FormData object.
 */
// the server's own explanation (e.g. why a picture could not be saved), else the status
const errorMessageOf = async (response) => {
    const data = translateAnswer(await response.json().catch(() => ({})));
    return data.errors?.join(' ') || data.message || response.statusText;
};

// clubId: the club to add the player to, the selected club when left out
const createPlayer = async (formData, clubId) => {
    try {
        const response = await fetch(API_URL + 'players', {
            method: 'POST',
            headers: getHeaders(false, clubId), // no Content-Type: let browser set multipart boundary
            body: formData
        });
        if (!response.ok) throw new Error(await errorMessageOf(response));
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getPlayer = async (playerId) => {
    try {
        const response = await fetch(API_URL + 'players/' + playerId, {
            method: 'GET',
            headers: getHeaders(false)
        });
        if (!response.ok) throw new Error(response.statusText);
        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Players of the club matching the search term. Guests of single games are
 * left out unless asked for (lists of past games need their names).
 */
const searchPlayers = async (searchTerm, { includeGuests = false } = {}) => {
    try {
        const response = await fetch(API_URL + 'players/search?search=' + encodeURIComponent(searchTerm ?? '') + (includeGuests ? '&includeGuests=true' : ''), {
            method: 'GET',
            headers: getHeaders(false)
        });
        if (!response.ok) throw new Error(response.statusText);
        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error.message);
    }
};

// when each player last played in the club: { [playerId]: date }
const lastPlayed = async () => {
    const response = await fetch(API_URL + 'players/last-played', { method: 'GET', headers: getHeaders(false) });
    if (!response.ok) throw new Error(response.statusText);
    return translateAnswer(await response.json());
};

const findPlayersByIds = async (playerIds) => {
    try {
        const response = await fetch(API_URL + 'players/find', {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify({ playerIds })
        });
        if (!response.ok) throw new Error(response.statusText);
        return translateAnswer(await response.json());
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Update an existing player.
 * Accepts either { id, formData } (new style from PlayerForm)
 * or a plain object (legacy callers) — auto-converts legacy objects to FormData.
 */
const updatePlayer = async (player) => {
    let formData;
    let id;

    if (player.formData instanceof FormData) {
        // New style: FormData already built by the caller
        formData = player.formData;
        id = player.id;
    } else {
        // Legacy style: plain object → build FormData here
        id = player.id;
        formData = new FormData();
        Object.keys(player).forEach(key => {
            if (player[key] !== undefined) formData.append(key, player[key]);
        });
    }

    try {
        const response = await fetch(API_URL + 'players/' + id, {
            method: 'PUT',
            // a player is edited in one of its clubs: the selected one, or player.clubId
            headers: getHeaders(false, player.clubId),
            body: formData
        });
        if (!response.ok) throw new Error(await errorMessageOf(response));
        return response.ok;
    } catch (error) {
        throw new Error(error.message);
    }
};

const deletePlayer = async (playerId, clubId) => {
    try {
        const response = await fetch(API_URL + 'players/' + playerId, {
            method: 'DELETE',
            headers: getHeaders(false, clubId)
        });
        if (!response.ok) throw new Error(response.statusText);
        // removed: "player" when deleted, "membership" when the player only left this club
        return translateAnswer(await response.json().catch(() => ({ removed: 'player' })));
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Links a player to the account with this email (created when needed), so
 * they can log in and play in the club on their own.
 */
const giveLogin = (playerId, account) =>
    requestJSON(`${API_URL}players/${playerId}/account`, { method: 'PUT', body: account });

const removeLogin = (playerId) =>
    requestJSON(`${API_URL}players/${playerId}/account`, { method: 'DELETE' });

// a login given and never used: the invitation again
const resendInvite = (playerId) => requestJSON(`${API_URL}players/${playerId}/account/invite`, { method: 'POST' });

// a player without a login: the address the club keeps ({ contact, claims, mailEnabled }) and the claim links
const loadContact = (playerId) => requestJSON(`${API_URL}players/${playerId}/contact`);
const saveContact = (playerId, contact) => requestJSON(`${API_URL}players/${playerId}/contact`, { method: 'PUT', body: contact });
const removeContact = (playerId) => requestJSON(`${API_URL}players/${playerId}/contact`, { method: 'DELETE' });
const createClaim = (playerId) => requestJSON(`${API_URL}players/${playerId}/claim`, { method: 'POST' });
const revokeClaims = (playerId) => requestJSON(`${API_URL}players/${playerId}/claim`, { method: 'DELETE' });

// taking over a player with a claim link: who it is for (no login needed), and doing it
const claimInfo = (token) => requestJSON(`${API_URL}claim/${encodeURIComponent(token)}`);
const claim = (token) => requestJSON(`${API_URL}claim/${encodeURIComponent(token)}`, { method: 'POST' });

/**
 * Adds a guest for a game. The guest does not become a member of the club.
 */
const createGuest = (name) =>
    requestJSON(API_URL + 'players/guest', { method: 'POST', body: { name } });

const makeMember = (playerId) =>
    requestJSON(`${API_URL}players/${playerId}/member`, { method: 'PUT' });

/**
 * Shows or hides a player's nickname on the public start page. The club
 * defaults to the active one.
 */
const setPublicProfile = (playerId, publicProfile, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/visibility`, { method: 'PUT', body: { publicProfile }, clubId });

// a player's favourite double and main treble ("auto" learns them from the games)
// whether the other players of the club see the player's trainings
const setTrainingPrivacy = (playerId, privateTrainings, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/training-privacy`, { method: 'PUT', body: { privateTrainings }, clubId });

const setPreferences = (playerId, preferences, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/preferences`, { method: 'PUT', body: preferences, clubId });

// a player's flights: points, and every shape and design owned, to unlock or locked
const loadFlights = (playerId, clubId) => requestJSON(`${API_URL}players/${playerId}/flights`, { clubId });
// unlocks a shape or design with the flight points: kind 'shape' | 'design'; the new standing
const unlockFlight = (playerId, kind, id, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/flights/unlock`, { method: 'POST', body: { kind, id }, clubId });

// a player's shirt and the designs their level opens; choosing one ({ design, color, accent })
const loadShirt = (playerId, clubId) => requestJSON(`${API_URL}players/${playerId}/shirt`, { clubId });
const setShirt = (playerId, shirt, clubId) => requestJSON(`${API_URL}players/${playerId}/shirt`, { method: 'PUT', body: shirt, clubId });

// how the players finish and score: { [playerId]: { doubleOrder, doubles, favouriteDouble, doubleSource, mainTreble, trebleSource, … } }
const loadCheckoutProfiles = (playerIds, clubId) =>
    requestJSON(`${API_URL}players/checkout-profiles`, { method: 'POST', body: { playerIds }, clubId });

/**
 * The clubs of a player of the selected club, each with whether the user may
 * change it; adding (or with "move" moving) to and removing from the user's clubs.
 */
const loadPlayerClubs = (playerId) => requestJSON(`${API_URL}players/${playerId}/clubs`);
const addPlayerToClub = (playerId, clubId, move = false) =>
    requestJSON(`${API_URL}players/${playerId}/clubs`, { method: 'POST', body: { club: clubId, move } });
const removePlayerFromClub = (playerId, clubId) =>
    requestJSON(`${API_URL}players/${playerId}/clubs/${clubId}`, { method: 'DELETE' });

const PlayerService = {
    setTrainingPrivacy,
    setPreferences,
    loadFlights,
    unlockFlight,
    loadShirt,
    setShirt,
    loadCheckoutProfiles,
    loadPlayerClubs,
    addPlayerToClub,
    removePlayerFromClub,
    setPublicProfile,
    createGuest,
    makeMember,
    giveLogin,
    resendInvite,
    loadContact,
    saveContact,
    removeContact,
    createClaim,
    revokeClaims,
    claimInfo,
    claim,
    removeLogin,
    createPlayer,
    getPlayer,
    searchPlayers,
    lastPlayed,
    findPlayersByIds,
    updatePlayer,
    deletePlayer
};

export default PlayerService;
