/**
 * The demo club of the screenshots, made through the API like a new user
 * would: an account, its club and the players. Nothing here is real.
 */
export const ACCOUNT = { email: 'alex.brunner@example.com', password: 'showcase-demo-only', firstname: 'Alex', lastname: 'Brunner' };
export const CLUB = {
    name: 'Red Lion Darts Club',
    description: 'Steel darts every Tuesday and Thursday from 7 pm in the back room of the Red Lion. New players welcome.',
};
// the admin plays too, as "Lex"
export const PLAYERS = [
    { firstname: 'Sam', lastname: 'Keller', nickname: 'Sammy', dateOfBirth: '1988-04-12' },
    { firstname: 'Mia', lastname: 'Frei', nickname: 'Mia', dateOfBirth: '1995-09-03' },
    { firstname: 'Noah', lastname: 'Graf', nickname: 'The Hammer', dateOfBirth: '1979-01-27' },
    { firstname: 'Lena', lastname: 'Rossi', nickname: 'Lena', dateOfBirth: '1992-06-18' },
    { firstname: 'Tom', lastname: 'Weber', nickname: 'Tommy', dateOfBirth: '1984-11-30' },
];

const jar = new Map();
const request = async (base, path, { method = 'GET', body, clubId, form } = {}) => {
    const headers = { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (clubId) headers['X-Club-Id'] = clubId;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + path, { method, headers, body: form ?? (body && JSON.stringify(body)) });
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
        const [pair] = cookie.split(';');
        const at = pair.indexOf('=');
        jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
    return data;
};

/**
 * Registers the account, sets up the club and adds its players.
 * → { clubId, players: [{ id, nickname }] }
 */
export const seed = async (base) => {
    await request(base, '/api/auth/register', { method: 'POST', body: { ...ACCOUNT, formTimeMs: 9000 } });
    const club = await request(base, '/api/clubs', { method: 'POST', body: { name: CLUB.name } });
    await request(base, `/api/clubs/${club.id}`, { method: 'PUT', body: { ...CLUB, isPublic: true, joinPolicy: 'approval' } });
    const me = await request(base, '/api/players/me', { method: 'POST', body: { nickname: 'Lex' }, clubId: club.id });
    const players = [{ id: me.id, nickname: me.nickname }];
    for (const player of PLAYERS) {
        const form = new FormData();
        Object.entries(player).forEach(([key, value]) => form.append(key, value));
        const added = await request(base, '/api/players', { method: 'POST', form, clubId: club.id });
        players.push({ id: added.id, nickname: added.nickname });
    }
    return { clubId: club.id, players };
};
