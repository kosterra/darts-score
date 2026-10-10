const PLAYER_IMG_BASE = '/api/images/players/';

/**
 * Resolves a player profileImg field to a displayable URL.
 * The API stores only the filename; this prepends the API base URL.
 * Passes through full URLs unchanged (backward compat with legacy data).
 */
export const resolvePlayerImg = (filename) => {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    return PLAYER_IMG_BASE + filename;
};

/**
 * Returns the initials for a player's full name (e.g. "John Doe" → "JD").
 */
export const resolvePlayerInitials = (firstname, lastname) =>
    (firstname + ' ' + lastname).split(' ').map(n => n[0]).join('');
