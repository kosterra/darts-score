import db from '../models/db.model.js';

/**
 * Connections between clubs (see models/club.link.model.js). A connection lets
 * either club invite the other into a shared tournament; it grants no other
 * access to the club's players, games or statistics.
 */

// the two club ids sorted, so a pair is stored once whichever side asks
export const sortedPair = (a, b) => [String(a), String(b)].sort();
export const pairKey = (a, b) => sortedPair(a, b).join('_');

// the other club of a connection, from the point of view of one of its clubs
export const otherClub = (link, clubId) => link.clubs.map(String).find(id => id !== String(clubId)) ?? null;

/**
 * The ids of the clubs a club is connected to (accepted connections only),
 * as an array of strings.
 */
export const connectedClubIds = async (clubId) => {
    const links = await db.clubLink.find({ clubs: clubId, status: 'accepted' }, 'clubs').lean();
    return links.map(link => otherClub(link, clubId)).filter(Boolean);
};

/**
 * True when the two clubs have an accepted connection.
 */
export const areConnected = async (a, b) => {
    if (String(a) === String(b)) return false;
    return Boolean(await db.clubLink.exists({ pair: pairKey(a, b), status: 'accepted' }));
};
