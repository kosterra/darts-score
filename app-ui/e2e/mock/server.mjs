// A stand-in for the API, for looking at the app in a browser without a
// database: a club with players, games, badges, tournaments and the rest,
// worked out with the API's own logic where it matters (badges, levels,
// flights, fair play). Start it, then the UI against it:
//
//   node e2e/mock/server.mjs
//   API_PROXY_TARGET=http://localhost:3901 npx vite --port 5199
//
// The user is a global admin; environment variables switch to other cases
// (e.g. AS_PLAYER, CLUB_ADMIN, LOGGED_OUT, NEW_USER; DASH=0 for a club
// without its statistics), and the tests
// switch with POST /__test/role { admin }, /__test/logged-out { loggedOut },
// /__test/tournaments { scenario }, /__test/leagues { scenario }, /__test/calendar { scenario }, /__test/session { leftMs } and
// /__test/notifications (two of them, one unread), /__test/evening (one with finished games).
globalThis.mockLoggedOut = Boolean(process.env.LOGGED_OUT);
import { NOTIFICATION_GROUPS, NOTIFICATION_TOPICS, normalizePreferences, preferenceOf } from '../../src/rules/notifications.js';
import { fpNewItems } from './fair.play.data.mjs';
import { checkBirthChange, checkTraining, checkX01, checkCricket, checkElimination, checkClock, compact, levelOf, repairX01, x01Legs, THRESHOLDS } from '../../../app-api/src/utils/integrity.js';
import fs from 'fs';
import { BADGES as realBadges, BADGE_CATEGORIES as realCategories, SHAME_BADGES } from '../../../app-api/src/utils/badges.js';
import http from 'node:http';
import { seedTournaments, tournamentMock } from './tournaments.mjs';
import { leagueMock, seedLeagues } from './leagues.mjs';
import { calendarMock, seedCalendar } from './calendar.mjs';
import { duelRecord, clubRatings, winChances } from '../../../app-api/src/utils/compare.js';
import { latestClubBadges, CLUB_BADGES, GOAL_METRICS, replayClubBadges, topClubBadges, publicClubBadge, goalProgress } from '../../../app-api/src/utils/club.badges.js';
import { clubKpis, headToHead as h2h, clubRecords, gameLog } from '../../../app-api/src/utils/club.insights.js';
import { flightStanding, unlockCheck, CATALOG, FEATS, POINT_RULES, RARITIES } from '../../../app-api/src/utils/flights.js';
import { shirtOf, shirtStanding, shirtCheck } from '../../../app-api/src/utils/shirts.js';
import { tally as deletionTally, deletionNotices } from '../../../app-api/src/utils/deletion.requests.js';
import { LEVELS, XP_RULES } from '../../../app-api/src/utils/levels.js';
import { clubBadgeOverview } from '../../../app-api/src/controllers/badge.controller.js';
import { gamesOverview } from '../../../app-api/src/utils/games.overview.js';
import { activityInsights, playersInsights } from '../../../app-api/src/utils/admin.insights.js';
import { quickGameView } from '../../../app-api/src/utils/quick.games.js';
import { x01StatsOf } from '../../../app-api/src/controllers/x01.stats.controller.js';
import { storedOf } from '../../../app-api/src/utils/game.view.js';
import { eveningView, newEvening, eveningGameError, eveningError } from '../../../app-api/src/utils/evenings.js';
import { normalizeClubRules, normalizeGamePreferences, ruleViolations } from '../../../app-api/src/rules/club.rules.js';
const quickGames = new Map();
const evenings = new Map();

const CLUB_NAME = process.env.SHOWCASE_T ? 'Red Lion Darts' : 'Test Club';
const user = { onboarding: process.env.NEW_USER ? { tourDoneAt: null, firstStepsHiddenAt: null } : { tourDoneAt: '2026-01-01T00:00:00Z', firstStepsHiddenAt: '2026-01-01T00:00:00Z' }, id: 'u1', email: 'test@example.com', firstname: process.env.SHOWCASE_T ? 'Lex' : 'Test', lastname: process.env.SHOWCASE_T ? 'Brunner' : 'User', language: process.env.USER_LANG ?? null, role: process.env.AS_PLAYER || process.env.CLUB_ADMIN ? 'user' : 'globalAdmin' };
let notificationPrefs = {};
let legal = process.env.LEGAL ? { operator: 'Darts Club Bern', address: 'Hauptstrasse 1\n3000 Bern', email: 'info@example.ch', notes: 'Hosted at home; the traffic goes through Cloudflare.' } : { operator: '', address: '', email: '', notes: '' };
const mfa = { enabled: Boolean(process.env.MFA_ON), loggedIn: false, left: 10, policy: 'optional', graceDays: 14 };
const mfaState = () => ({ enabled: mfa.enabled, required: Boolean(process.env.MFA_DUE), setupDue: process.env.MFA_DUE && !mfa.enabled ? new Date(Date.now() + 9 * 864e5).toISOString() : null, mustSetUp: false, recoveryLeft: mfa.enabled ? mfa.left : 0, enabledAt: mfa.enabled ? new Date(Date.now() - 20 * 864e5).toISOString() : null });
let contactOf = null;
let claimCount = 0;
const club = { accent: process.env.CLUB_ACCENT ?? null, id: 'c1', name: CLUB_NAME, country: 'CH', joinPolicy: 'approval', openJoinRequests: process.env.JOIN_REQUESTS ? 2 : 0, role: process.env.AS_PLAYER ? 'player' : 'admin', admins: [{ id: 'u1', firstname: 'Test', lastname: 'User', email: 'test@example.com' }, { id: 'u7', firstname: 'Ida', lastname: 'Admin', email: 'ida@example.com' }], playerCount: 6 };
const names = process.env.SHOWCASE_T
    ? [['Lex', 'Brunner'], ['The Hammer', 'Meier'], ['Mia', 'Keller'], ['Sammy', 'Frei'], ['Lena', 'Graf'], ['Tommy', 'Rossi'], ['Jonas', 'Weber'], ['Sara', 'Huber'], ['Nico', 'Baumann'], ['Lea', 'Fischer'], ['Marco', 'Bianchi'], ['Julia', 'Steiner'], ['Luca', 'Moser'], ['Nina', 'Wyss'], ['Tim', 'Schmid'], ['Elena', 'Ferrari']]
    : [['Anna', 'Muster'], ['Ben', 'Keller'], ['Cleo', 'Frei'], ['Dario', 'Rossi'], ['Eva', 'Graf'], ['Finn', 'Baumann']];
const players = names.map(([firstname, lastname], i) => ({ id: `p${i + 1}`, nickname: firstname, firstname, lastname, profileImg: '', country: ['CH', 'DE', 'FR', 'IT', 'GB-ENG', ''][i % 6], clubs: ['c1'], user: i === 0 ? 'u1' : (i === 1 && process.env.BEN_LOGIN ? 'u2' : null) }));
const ref = (p) => ({ id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, profileImg: '' });

let seq = 0;
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
const perTarget = (darts) => { const t = Array(21).fill(1); let rest = darts - 21; let i = 0; while (rest-- > 0) { t[(i * 7) % 21] += 1; i++; } return t; };
const entries = [];
const reviews = new Map();
const deletionRequests = [];
const trainings = new Map();
const games = new Map();
if (process.env.TRAININGS) {
    const pm = (won, legs, avg) => ({ hasWonGame: won, legsWon: { game: legs }, averages: { game: { overall: avg } } });
    trainings.set('t901', { id: 't901', club: 'c1', players: ['p1', 'bot'], startingScore: 501, legOutMode: 'Double Out', hasWinner: true, playerModels: { p1: pm(true, 3, 48.2), bot: pm(false, 1, 45.1) }, createdAt: ago(0.2) });
    trainings.set('t902', { id: 't902', club: 'c1', players: ['p2', 'bot'], startingScore: 301, legOutMode: 'Straight Out', hasWinner: false, playerModels: { p2: pm(false, 0, 33.3), bot: pm(false, 1, 30) }, createdAt: ago(0.1) });
}
if (process.env.SHAME_GAME) {
    const t = JSON.parse(fs.readFileSync(new URL('./clock-template.json', import.meta.url)));
    const [, b] = t.players;
    const map = (id) => id === b ? 'p1' : 'p2';
    games.set('g900', { ...t, _id: undefined, id: 'g900', players: t.players.map(map), currentPlayerTurn: map(t.currentPlayerTurn), playerModels: Object.fromEntries(Object.entries(t.playerModels).map(([k, v]) => [map(k), v])) });
}
// fewest darts in Double: a dozen rounds
[[1, 38, 3], [2, 44, 10], [3, 51, 2], [4, 47, 40], [5, 60, 1], [6, 41, 5], [2, 39, 0.2], [3, 56, 20], [1, 45, 15], [4, 49, 0.1]]
    .forEach(([p, darts, days]) => entries.push({ id: `e${++seq}`, mode: 'Double', scoring: 'Darts', darts, dartsPerTarget: perTarget(darts), player: ref(players[p - 1]), createdAt: ago(days) }));
// against the clock in Double
[[1, 9123, 2], [2, 8456, 30], [3, 10234, 1], [4, 7890, 50], [5, 12001, 0.3], [6, 9555, 4], [1, 8800, 12], [2, 9900, 0.5], [3, 11200, 7], [4, 13000, 3], [5, 9700, 9], [6, 10500, 0.4]]
    .forEach(([p, timeMs, days]) => entries.push({ id: `e${++seq}`, mode: 'Double', scoring: 'Time', timeMs, player: ref(players[p - 1]), createdAt: ago(days) }));

// X01 games with data errors: g800 cannot be repaired (the darts do not finish), g801 can
if (process.env.FAIR_X01) {
    const v = (playerId, darts, roundScore, scoreLeft) => ({ playerId, darts, roundScore, scoreLeft });
    const base = (id, leg, days) => ({ id, startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', players: ['p1', 'p2'], hasWinner: true,
        playerModels: { p1: { hasWonGame: true }, p2: {} }, allSetsThrows: { 'set-1': { 'leg-1': leg } },
        createdAt: ago(days + 0.05), updatedAt: ago(days) });
    games.set('g800', base('g800', [
        v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S20', 'S20', 'S1'], 41, 460),
        v('p1', ['T20', 'T19', 'D20'], 157, 164), v('p2', ['S20', 'S20', 'S1'], 41, 419),
        v('p1', ['T20', 'S10'], 70, 94), v('p2', ['S20', 'S20', 'S1'], 41, 378),
        v('p1', ['S20', 'S4', 'S4'], 28, 143), v('p2', ['S20', 'S20', 'S1'], 41, 337),
        v('p1', ['S20', 'S20', 'S6'], 46, 97), v('p2', ['S20', 'S20', 'S1'], 41, 296),
        v('p1', ['T20', 'D16'], 92, 5), v('p2', ['S20', 'S20', 'S1'], 41, 255),
        v('p1', ['S1', 'D2'], 5, 0),
    ], 1));
    games.set('g801', base('g801', [
        v('p1', ['T20', 'T20', 'T20'], 180, 321), v('p2', ['S20', 'S20', 'S1'], 41, 460),
        v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S20', 'S20', 'S1'], 41, 419),
        v('p1', ['T20', 'T20', 'T20'], 180, 141), v('p2', ['S20', 'S20', 'S1'], 41, 378),
        v('p1', ['S20', 'S20', 'S1'], 41, 280), v('p2', ['S20', 'S20', 'S1'], 41, 337),
        v('p1', ['T20', 'D20'], 100, 0),
    ], 2));
}
const notifications = process.env.FAIR_X01 ? [
    { id: 'n1', kind: 'fairPlayDeleted', title: 'Your game was deleted for fair play', body: 'X01 · 501 · Straight In / Double Out, played on 12.10.2026, by Anna, Ben. Why: A dart that is not on the board. The badges earned in it were taken back; badges earned again elsewhere stay.', link: null, club: 'c1', byName: 'Gia Global', at: ago(0.1), read: false },
    { id: 'n2', kind: 'fairPlayRepaired', title: 'A game in Test Club was repaired', body: 'X01 · 501, played on 10.10.2026, by Cleo, Dario. Why: A score left that does not add up. The scores left were worked out again from the darts; the darts, the winner and the statistics stay as they were.', link: '/stats/games/x01/g801', club: 'c1', byName: 'Gia Global', at: ago(3), read: true },
] : [];

const session = { loggedIn: true, expiresAt: Date.now() + 5 * 3600e3 };
let sessionHours = 5;

const birthChange = { from: new Date(1990, 0, 1), to: new Date(1994, 0, 1), at: new Date() };
let birthRestored = false;

const joinClubs = [
    { id: 'j1', name: 'Open Arrows', country: 'GB', description: 'Tuesday and Thursday evenings in the back room of the Rose and Crown.', logo: '', joinPolicy: 'open', playerCount: 14, isMember: false, request: null },
    { id: 'j2', name: 'Bullseye Basel', description: '', logo: '', joinPolicy: 'approval', playerCount: 31, isMember: false, request: null },
    { id: 'j3', name: 'Double Trouble', country: 'DE', description: 'League team, new players welcome after a trial evening.', logo: '', joinPolicy: 'approval', playerCount: 9, isMember: false, request: { id: 'jr3', status: 'declined', at: new Date(Date.now() - 4 * 864e5), decidedAt: new Date(Date.now() - 2 * 864e5) } },
    { id: 'c1', name: CLUB_NAME, description: '', logo: '', joinPolicy: 'open', playerCount: 6, isMember: true, request: null },
    { id: 'c7', name: 'Red Lion Darts Club', description: 'Tuesdays and Thursdays', logo: '', joinPolicy: 'approval', playerCount: 24, isMember: false, request: null },
    { id: 'c8', name: 'Bullseye Basel', description: '', logo: '', joinPolicy: 'open', playerCount: 11, isMember: false, request: null },
];
const clubRequests = process.env.JOIN_REQUESTS ? [
    { id: 'q1', club: 'c1', name: 'Ben Newman', email: 'ben@example.com', nickname: 'Benny', message: 'I play on Tuesdays, average about 45. Would love to join the league team!', status: 'open', at: new Date(Date.now() - 864e5) },
    { id: 'q2', club: 'c1', name: 'Clara Long-Surname-Example', email: 'clara@example.com', nickname: 'Clarabella', message: '', status: 'open', at: new Date(Date.now() - 3600e3) },
] : [];
const sendNow = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
// SLOW=ms: the data comes late (not the login, the clubs and the settings), to see the skeletons
const send = (res, status, body) => {
    const path = res.req?.url ?? '';
    if (process.env.SLOW && !/^\/api\/(auth|clubs(\?|$)|settings|session|public|notifications\/count)/.test(path)) return setTimeout(() => sendNow(res, status, body), Number(process.env.SLOW));
    return sendNow(res, status, body);
};

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        let json = {};
        try { json = body ? JSON.parse(body) : {}; } catch { json = {}; }
        if (path === '/__test/calendar') { seedCalendar(players.filter(p => !p.guest), json.scenario); return send(res, 200, {}); }
        if (path.startsWith('/api/calendar') && calendarMock(req, res, path, json, send, { players: players.filter(p => !p.guest), me: 'p1', isAdmin: club.role === 'admin', url }) !== false) return;
        if (path === '/__test/leagues') { seedLeagues(players.filter(p => !p.guest), json.scenario); return send(res, 200, {}); }
        if (path.startsWith('/api/leagues') && leagueMock(req, res, path, json, send, { players: players.filter(p => !p.guest), me: 'p1' }) !== false) return;
        if (path === '/__test/tournaments') { seedTournaments(players, json.scenario); return send(res, 200, {}); }
        if (path.startsWith('/api/tournament') && tournamentMock(req, res, path, json, send, { players: players.filter(p => !p.guest), me: 'p1', isAdmin: club.role === 'admin', url }) !== false) return;
        if (path === '/__test/logged-out' && req.method === 'POST') { globalThis.mockLoggedOut = Boolean(json.loggedOut); return send(res, 200, {}); }
        if (path === '/__test/role' && req.method === 'POST') { user.role = json.admin ? 'globalAdmin' : 'user'; club.role = json.admin ? 'admin' : 'player'; user.id = json.user ?? 'u1'; return send(res, 200, {}); }
        if (path === '/api/stats/favourites') return send(res, 200, [
            { id: 'fav1aaaaaaaa', type: 'x01', kind: null, settings: { startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 5, legStarter: 'rotate', roundLimit: 0, bull: 'split' }, players: ['p1', 'p2'], opponents: ['p2'], count: 14, lastAt: new Date(Date.now() - 2 * 864e5) },
            { id: 'fav2bbbbbbbb', type: 'cricket', kind: null, settings: { variant: 'Standard', roundLimit: 0 }, players: ['p3', 'p1', 'p4'], opponents: ['p3', 'p4'], count: 6, lastAt: new Date(Date.now() - 5 * 864e5) },
            { id: 'fav3cccccccc', type: 'rules', kind: 'shanghai', settings: {}, players: ['p1', 'p5'], opponents: ['p5'], count: 3, lastAt: new Date(Date.now() - 9 * 864e5) },
        ]);
        if (path.startsWith('/api/stats/favourites/') && req.method === 'POST') return send(res, 201, { type: 'x01', kind: null, id: 'x9', path: '/x01/x9' });
        if (path === '/api/public/support' || path === '/api/admin/support') {
            globalThis.support ??= { url: '', twint: '' };
            if (req.method === 'PUT') globalThis.support = { url: json.url ?? '', twint: json.twint ?? '' };
            const project = 'https://github.com/sponsors/kosterra';
            return send(res, 200, { ...globalThis.support, project: path.startsWith('/api/public') && globalThis.support.url === project ? '' : project });
        }
        if (path === '/api/admin/start-page') { globalThis.startPage ??= { showNumbers: false, publicSite: true }; if (req.method === 'PUT') Object.assign(globalThis.startPage, json); return send(res, 200, { ...globalThis.startPage, numbers: { clubs: 3, players: 41, gamesPlayed: 812, gamesThisWeek: 37 } }); }
        if (path === '/api/auth/onboarding') { const now = new Date().toISOString(); if (json.tour) user.onboarding.tourDoneAt = json.tour === 'done' ? now : null; if (json.firstSteps) user.onboarding.firstStepsHiddenAt = json.firstSteps === 'hidden' ? now : null; return send(res, 200, user); }
        if (path === '/api/stats/first-steps') return send(res, 200, process.env.AS_PLAYER ? { role: 'member', items: [{ id: 'you', done: true }, { id: 'firstGame', done: false }, { id: 'training', done: false }, { id: 'notifications', done: true }, { id: 'app', done: null }] } : { role: 'admin', items: [{ id: 'clubProfile', done: false }, { id: 'players', done: true }, { id: 'rules', done: false }, { id: 'firstGame', done: false }, { id: 'you', done: true }] });
        if (path === '/api/public/site') return send(res, 200, { publicSite: !process.env.PRIVATE_SITE });
        if (path === '/api/public/legal') return send(res, 200, { ...legal, notes: typeof legal.notes === 'object' ? (legal.notes[(req.headers['accept-language'] || 'en').slice(0, 2)] || legal.notes.en || '') : legal.notes, mailEnabled: true, keep: { sessionHours: 5, trustedDeviceDays: 30, quickGameDays: 30, quickUnfinishedDays: 3, notificationDays: 365, fairPlayDays: 31, errorLogDays: 30, claimLinkDays: 30 } });
        if (path === '/api/admin/legal') { if (typeof legal.notes !== 'object') legal.notes = { en: legal.notes, de: '', fr: '', it: '', es: '' }; if (req.method === 'PUT') legal = { ...legal, ...json }; return send(res, 200, { ...legal, limits: { operator: 200, address: 500, email: 254, notes: 2000 } }); }
        if (path === '/api/auth/delete-account' && req.method === 'GET') return send(res, 200, { globalAdmin: null, clubs: process.env.SOLE_ADMIN ? [{ id: 'c1', name: 'Red Lion Darts', members: 6, candidates: [{ id: 'u2', name: 'Ben Huber' }, { id: 'u3', name: 'Lena Frei' }] }, { id: 'c9', name: 'Garage Darts', members: 1, candidates: [] }] : [] });
        if (path === '/api/auth/delete-account' && process.env.SOLE_ADMIN && (json.clubs ?? []).length !== 2) return send(res, 409, { message: 'Hand Garage Darts over or delete it first.' });
        if (path === '/api/auth/delete-account') return json.password === 'secret123' ? send(res, 200, { message: 'Your account was deleted.' }) : send(res, 403, { message: 'The current password is wrong.' });
        // two-step login (MFA_LOGIN=code|enroll: the login asks for it; MFA_DUE=1: a reminder to set it up)
        if (path === '/api/auth/me' && process.env.MFA_LOGIN && !mfa.loggedIn) return send(res, 401, { message: 'Please log in.' });
        if (path === '/api/auth/me' && (process.env.MFA_LOGIN || process.env.MFA_DUE || mfa.enabled)) return send(res, 200, { ...user, mfaEnabled: mfa.enabled, mfa: mfaState() });
        if (path === '/api/auth/login' && process.env.MFA_LOGIN) return send(res, 200, { mfaRequired: true, step: process.env.MFA_LOGIN });
        if (path === '/api/auth/login/mfa') {
            if (json.code === '123456' || json.recoveryCode === 'abcd-efgh') { mfa.loggedIn = true; return send(res, 200, { ...user, mfaEnabled: true, mfa: mfaState() }); }
            return send(res, 401, { message: 'This code is not right. Check the time of your phone and try the newest code.' });
        }
        if (path === '/api/auth/mfa' && req.method === 'GET') return send(res, 200, mfaState());
        if (path === '/api/auth/mfa/setup') return send(res, 200, { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Oche:test%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Oche' });
        if (path === '/api/auth/mfa/enable') {
            if (json.code !== '123456') return send(res, 422, { errors: ['This code is not right. Check the time of your phone and try the newest code.'] });
            mfa.enabled = true; mfa.loggedIn = true; mfa.left = 10;
            const recoveryCodes = ['k7m2-x9qp', 'a3fr-p8nd', 'h2wq-m6tz', 'r9ck-v3hs', 'b5yx-n2qe', 'u8gt-d4wm', 'e6pj-s7ka', 'z3nv-c9rf', 'q4mh-y2ub', 'w7dt-g5xs'];
            return send(res, 200, process.env.MFA_LOGIN ? { ...user, mfaEnabled: true, mfa: mfaState(), recoveryCodes } : { recoveryCodes, mfa: mfaState() });
        }
        if (path === '/api/auth/mfa/recovery-codes') return json.code === '123456' ? send(res, 200, { recoveryCodes: ['n3wc-0de1', 'n3wc-0de2'], mfa: mfaState() }) : send(res, 403, { message: 'This code is not right.' });
        if (path === '/api/auth/mfa/disable') { mfa.enabled = false; return send(res, 200, { mfa: mfaState() }); }
        if (path === '/api/auth/mfa/forget-devices') return send(res, 200, { message: 'ok' });
        // passkeys: kept as the browser made them, not checked (the API checks them; see its tests)
        globalThis.mockPasskeys ??= [];
        const b64 = (bytes) => Buffer.from(bytes).toString('base64url');
        const challenge = () => b64(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)));
        const passkeyList = () => ({ passkeys: globalThis.mockPasskeys.map(({ id, name, createdAt, lastUsedAt }) => ({ id, name, synced: false, createdAt, lastUsedAt })) });
        if (path === '/api/auth/passkeys' && req.method === 'GET') return send(res, 200, passkeyList());
        if (path === '/api/auth/passkeys/options') {
            if (json.password !== 'secret123') return send(res, 403, { message: 'The current password is wrong.' });
            return send(res, 200, { challenge: challenge(), rp: { id: 'localhost', name: 'Legmate' }, user: { id: b64([1, 2, 3, 4]), name: user.email, displayName: 'Test User' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], authenticatorSelection: { residentKey: 'required', userVerification: 'required' }, attestation: 'none', excludeCredentials: [] });
        }
        if (path === '/api/auth/passkeys' && req.method === 'POST') {
            globalThis.mockPasskeys.push({ id: json.response.id, name: 'Linux', createdAt: new Date().toISOString(), lastUsedAt: null });
            return send(res, 201, passkeyList());
        }
        if (path.startsWith('/api/auth/passkeys/') && req.method === 'DELETE') {
            globalThis.mockPasskeys = globalThis.mockPasskeys.filter(passkey => passkey.id !== decodeURIComponent(path.split('/').pop()));
            return send(res, 200, passkeyList());
        }
        if (path === '/api/auth/login/passkey/options') return send(res, 200, { challenge: challenge(), rpId: 'localhost', userVerification: 'required', timeout: 60000 });
        if (path === '/api/auth/login/passkey') {
            const known = globalThis.mockPasskeys.find(passkey => passkey.id === json.response?.id);
            if (!known) return send(res, 401, { message: 'This passkey does not open an account here. Log in with your password, and add the passkey under Profile → Account.' });
            known.lastUsedAt = new Date().toISOString();
            globalThis.mockLoggedOut = false;
            return send(res, 200, { ...user, mfa: { enabled: false, required: false } });
        }
        if (path === '/api/admin/dashboard') {
            const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
            return send(res, 200, { numbers: { clubs: 14, players: 213, gamesPlayed: 4821, gamesThisWeek: 96, users: 87, usersNew: 3, quickGames: 41 }, now: { sessions: 9, users: 7 }, week: { users: 38 }, attention: { critical: 0, warning: 2, errors: 4 }, mail: { configured: true, today: 23, limit: 200 }, backups: { latest: { name: 'x', kind: 'auto', createdAt: h(19) }, count: 4, enabled: true, nextAt: h(-5), lastError: null }, health: process.env.HEALTHY ? { problems: [], checked: 9 } : { checked: 9, problems: [{ id: 'mail', level: 'bad', title: 'The mail server refuses the mails', detail: 'The mail server refused the login. Check SMTP_USER and SMTP_PASSWORD.', fix: { to: '/system-settings#mail-server' } }, { id: 'mfaKey', level: 'warn', title: 'MFA_KEY is not set', detail: 'The secrets of two-step login are encrypted with a key from SESSION_SECRET: changing that secret ends every two-step login. Set MFA_KEY once and keep it.', fix: { env: 'MFA_KEY' } }, { id: 'backupDisk', level: 'warn', title: 'The backups lie on the same disk as the data', detail: 'A broken disk takes both. Mount another disk or a network share (e.g. NFS) at /app/data/backups, or download a backup now and then.', fix: { to: '/admin/backups' } }] } });
        }
        if (path.startsWith('/api/admin/backups')) {
            const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
            globalThis.mockBackups ??= [['auto', 19, 48e6], ['manual', 30, 47.5e6], ['auto', 43, 47e6], ['before-restore', 70, 46e6], ['upload', 140, 900e3]].map(([kind, n, size], i) => ({ name: `legmate-2026102${i}-030000-${kind}.json.gz`, kind, createdAt: h(n), size }));
            globalThis.mockSchedule ??= { enabled: true, frequency: 'daily', hour: 3, weekday: 1, keep: 7, lastRunAt: h(19), lastError: process.env.BACKUP_ERROR ? 'ENOSPC: no space left on device' : null, nextAt: h(-5), timeZone: 'Europe/Zurich' };
            if (path === '/api/admin/backups' && req.method === 'GET') return send(res, 200, { backups: process.env.NO_BACKUPS ? [] : globalThis.mockBackups, schedule: globalThis.mockSchedule, busy: false });
            if (path === '/api/admin/backups' && req.method === 'POST') { const b = { name: `legmate-20261025-2200${String(globalThis.mockBackups.length).padStart(2, '0')}-manual.json.gz`, kind: 'manual', createdAt: new Date().toISOString(), size: 48.2e6 }; globalThis.mockBackups.unshift(b); return send(res, 201, b); }
            if (path === '/api/admin/backups/schedule') { Object.assign(globalThis.mockSchedule, json); return send(res, 200, globalThis.mockSchedule); }
            if (path.endsWith('/restore')) return json.confirm === 'RESTORE' ? send(res, 200, { counts: {}, before: 'x', restart: Boolean(process.env.RESTART) }) : send(res, 422, { message: 'Type RESTORE to confirm.' });
            if (req.method === 'DELETE') { const name = path.split('/').pop(); globalThis.mockBackups = globalThis.mockBackups.filter(b => b.name !== name); return send(res, 200, { message: 'Backup deleted.' }); }
        }
        if (path.startsWith('/api/admin/sessions') || path === '/api/admin/usage') {
            const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
            globalThis.mockSessions ??= [
                { id: 'u1', firstname: 'Rafael', lastname: 'Koster', email: 'test@example.com', role: 'globalAdmin', sessions: [
                    { id: 'a1', device: 'Chrome · Linux', startedAt: ago(95), lastSeenAt: ago(0.2), expiresAt: ago(-205), current: true },
                    { id: 'a2', device: 'Safari · iPhone', startedAt: ago(600), lastSeenAt: ago(140), expiresAt: ago(-20), current: false } ] },
                { id: 'u2', firstname: 'Lena', lastname: 'Brunner', email: 'lena.brunner@example.ch', role: 'user', sessions: [
                    { id: 'b1', device: 'Firefox · Android', startedAt: ago(30), lastSeenAt: ago(2), expiresAt: ago(-270), current: false } ] },
                { id: 'u3', firstname: 'Tommy', lastname: 'Meier', email: 'tommy@example.ch', role: 'user', sessions: [
                    { id: 'c1', device: 'Edge · Windows', startedAt: ago(200), lastSeenAt: ago(25), expiresAt: ago(-100), current: false },
                    { id: 'c2', device: 'Safari · iPad', startedAt: ago(250), lastSeenAt: ago(70), expiresAt: ago(-50), current: false } ] },
            ];
            if (req.method === 'DELETE') {
                const [, , , , kind, id] = path.split('/');
                if (kind === 'users') globalThis.mockSessions = globalThis.mockSessions.filter(u => u.id !== id);
                else globalThis.mockSessions = globalThis.mockSessions.map(u => ({ ...u, sessions: u.sessions.filter(x => x.id !== kind) })).filter(u => u.sessions.length);
            }
            if (path === '/api/admin/usage') {
                const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
                const weeks = Array.from({ length: 12 }, (_, i) => {
                    const start = new Date(monday); start.setDate(start.getDate() - 7 * i); const end = new Date(start); end.setDate(end.getDate() + 7);
                    const f = i === 0 ? 0.5 : 1 - i * 0.04;
                    return { start, end, current: i === 0, tracked: i < 6, activeUsers: i < 6 ? Math.round(42 * f + (i % 3)) : 0, logins: i < 6 ? Math.round(118 * f) : 0,
                        busiestDay: null, newUsers: Math.round(5 * f), newClubs: i % 4 === 0 ? 1 : 0, newPlayers: Math.round(9 * f), activeClubs: 5 + (i % 2),
                        games: { total: Math.round(230 * f - i * 3), x01: 150, cricket: 40, elimination: 10, clock: 10, more: 20 }, finishedGames: Math.round(200 * f), num180s: 12, trainings: Math.round(30 * f), quickGames: 7 + i, mails: 1200 + i * 40, mailsHeldBack: i === 1 ? 74 : 0, mailLimitDays: i === 1 ? 2 : i === 4 ? 1 : 0 };
                });
                const since = new Date(monday); since.setDate(since.getDate() - 37);
                return send(res, 200, { since, weeks });
            }
            const list = globalThis.mockSessions.map(u => ({ ...u, lastSeenAt: u.sessions[0].lastSeenAt }));
            const sessions = list.reduce((n, u) => n + u.sessions.length, 0);
            return send(res, 200, { activeMinutes: 5, totals: { sessions, users: list.length, activeNow: list.filter(u => Date.now() - new Date(u.lastSeenAt) < 300000).length, usedToday: 11 }, users: list });
        }
        if (path === '/api/admin/mail-server' || path === '/api/admin/mail-server/limit') {
            if (path.endsWith('/limit')) globalThis.mailLimit = json.perDay;
            const lim = globalThis.mailLimit === undefined ? 300 : globalThis.mailLimit;
            const counts = [212, 300, 187, 300, 96, 143, 120];
            const days = counts.map((mails, back) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - back); return { day, mails, heldBack: mails === 300 ? 37 + back : 0, limit: lim, reached: lim ? mails >= lim : false }; });
            return send(res, 200, { configured: true, host: 'smtp.example.com', port: 587, encryption: 'starttls', user: 'oche@example.com', password: true, from: 'Oche <oche@example.com>', appUrl: 'https://oche.example.com', missing: [], limit: { limit: lim, days } });
        }
        if (path === '/api/admin/mail-server/test') return json.to.startsWith('fail')
            ? send(res, 502, { message: 'The mail server refused the login. Check SMTP_USER and SMTP_PASSWORD.', code: 'EAUTH', detail: '535 5.7.8 Error: authentication failed: UGFzc3dvcmQ6', ms: 412 })
            : send(res, 200, { sentTo: json.to, response: '250 2.0.0 Ok: queued as 4ZxY1q2Rk3', messageId: '<abc@example.com>', rejected: [], ms: 638 });
        if (path === '/api/admin/mail-templates') return send(res, 200, { language: url.searchParams.get('language') ?? 'en', languages: ['en', 'de', 'fr', 'it', 'es'], templates: [], limits: { subject: 150, body: 4000, button: 40 } });
        if (path === '/api/admin/mfa') {
            if (req.method === 'PUT') { if ((json.policy === 'admins' || json.policy === 'everyone') && !mfa.enabled) return send(res, 409, { message: 'Turn on two-step login for your own account first (Profile → Account).' }); mfa.policy = json.policy; mfa.graceDays = json.graceDays; }
            return send(res, 200, { policy: mfa.policy, graceDays: mfa.graceDays, requiredSince: mfa.policy === 'admins' || mfa.policy === 'everyone' ? ago(1) : null, policies: ['off', 'optional', 'admins', 'everyone'], graceLimits: { min: 0, max: 60, default: 14 }, ownEnabled: mfa.enabled });
        }
        if (globalThis.mockLoggedOut && path.startsWith('/api/auth/') && path !== '/api/auth/config') return send(res, 401, { message: 'Please log in.' });
        if (path === '/api/public/overview') {
            const pc = (name, extra) => ({ name, description: '', logo: null, createdAt: ago(300), playerCount: 12, joinPolicy: 'closed', gamesPlayed: 0, gamesLast30Days: 0, lastGameAt: null, x01Average: null, num180s: 0, busiestDay: null, ...extra });
            return send(res, 200, {
                totals: { clubs: 14, players: 186, gamesPlayed: 4821, gamesThisWeek: 73 },
                clubs: [
                    pc('Red Lion Darts Club', { description: 'Steel darts every Tuesday and Thursday from 7 pm in the back room of the Red Lion. New players welcome.', playerCount: 24, joinPolicy: 'approval', gamesPlayed: 1284, gamesLast30Days: 96, lastGameAt: ago(0.1), x01Average: 48.7, num180s: 213, busiestDay: 'Thursday' }),
                    pc('Bullseye Basel', { country: 'CH', description: 'League team in the Basel district league.', playerCount: 11, joinPolicy: 'open', gamesPlayed: 402, gamesLast30Days: 31, lastGameAt: ago(2), x01Average: 55.2, num180s: 88, busiestDay: 'Tuesday' }),
                    pc('Family Brunner', { playerCount: 4, gamesPlayed: 37, gamesLast30Days: 3, lastGameAt: ago(9), x01Average: 31.4, num180s: 0 }),
                ],
                liveGames: process.env.NO_LIVE ? [] : [{ id: 'l1', type: 'x01', label: 'X01', club: 'Red Lion Darts Club', format: '501 · Best of 1 set · Best of 3 legs', players: [{ name: 'Lex', score: 141, legs: 1, sets: 0, isTurn: true }, { name: 'Hidden player', score: 220, legs: 0, sets: 0 }] }],
                results: process.env.NO_RESULTS ? [] : [{ id: 'r1', type: 'cricket', label: 'Cricket', club: 'Bullseye Basel', format: 'Cricket', players: [{ name: 'Mia', score: 120, isWinner: true }, { name: 'Tommy', score: 65 }] }],
            });
        }
        const pc = path.match(/^\/api\/players\/(p\d+)\/clubs(?:\/(c\d+))?$/);
        if (pc) {
            const player = players.find(p => p.id === pc[1]);
            const all = [{ id: 'c1', name: CLUB_NAME, logo: '', canManage: true }, { id: 'c2', name: 'Testclub 2', logo: '', canManage: true }];
            player.clubs = player.clubs ?? ['c1'];
            if (req.method === 'POST') { if (!player.clubs.includes(json.club)) player.clubs.push(json.club); if (json.move) player.clubs = player.clubs.filter(c => c !== 'c1'); }
            if (req.method === 'DELETE') player.clubs = player.clubs.filter(c => c !== pc[2]);
            return send(res, 200, all.filter(c => player.clubs.includes(c.id)));
        }
        // joining clubs
        if (path === '/api/clubs/directory') {
            const q = (url.searchParams.get('q') ?? '').toLowerCase();
            return send(res, 200, { nickname: process.env.NO_PLAYER ? null : 'Tester', clubs: joinClubs.filter(c => c.name.toLowerCase().includes(q)).map(c => ({ ...c, badges: club.badges ?? [], badgeCount: club.badgeCount ?? 0 })) });
        }
        if (path === '/api/clubs/join-requests') return send(res, 200, joinClubs.filter(c => c.request?.status === 'open').map(c => ({ id: c.request.id, club: c.id, clubName: c.name, clubLogo: '', nickname: 'Tester', status: 'open', at: c.request.at })));
        const jm = path.match(/^\/api\/clubs\/([^/]+)\/join$/);
        if (jm) {
            const c = joinClubs.find(x => x.id === jm[1]);
            if (req.method === 'DELETE') { c.request = null; return send(res, 200, { status: 'withdrawn' }); }
            if (c.joinPolicy === 'open') { c.isMember = true; return send(res, 201, { status: 'member', club: c.id, player: { nickname: json.nickname ?? 'Tester' } }); }
            c.request = { id: 'jr' + c.id, status: 'open', at: new Date() };
            return send(res, 201, { status: 'pending', request: { id: c.request.id } });
        }
        const jr = path.match(/^\/api\/clubs\/([^/]+)\/join-requests(?:\/([^/]+))?$/);
        if (jr) {
            if (req.method === 'PUT') { const i = clubRequests.findIndex(r => r.id === jr[2]); clubRequests.splice(i, 1); return send(res, 200, { status: json.accept ? 'accepted' : 'declined' }); }
            return send(res, 200, clubRequests);
        }
        const dr = path.match(/^\/api\/games\/deletion-requests(?:\/([^/]+))?(\/answer|\/decide)?$/);
        if (dr) {
            const [, id, action] = dr;
            const view = (r) => ({ ...r, mine: r.by === user.id, players: r.players.map(p => ({ player: p.player, nickname: p.nickname, hasLogin: Boolean(p.user), mine: p.user === user.id, answer: p.answer })), ...deletionTally(r) });
            const close = (r, status, auto) => { r.status = status; r.decidedByName = auto ? '' : `${user.firstname} ${user.lastname}`; if (status === 'deleted') { const g = games.get(r.game); if (g) g.deleted = true; } notifications.unshift(...deletionNotices(status, { ...r, _id: r.id }, { actor: { id: user.id, name: 'Test User' }, clubName: CLUB_NAME, admins: ['u9'], auto }).map((n, i) => ({ ...n, id: `n${++seq}${i}`, at: new Date().toISOString(), read: false }))); };
            if (req.method === 'GET' && !id) return send(res, 200, deletionRequests.filter(r => r.status === 'open').map(view));
            const r = id && deletionRequests.find(x => x.id === id);
            if (req.method === 'GET') return r ? send(res, 200, view(r)) : send(res, 404, { message: 'The request was not found.' });
            if (req.method === 'POST') {
                const g = games.get(json.game);
                const r2 = { id: `r${++seq}`, type: json.type, game: json.game, summary: 'X01 · 501', playedAt: g.updatedAt, by: user.id, byName: 'Test User', reason: json.reason, status: 'open', at: new Date().toISOString(),
                    players: g.players.map(pid => { const p = players.find(x => x.id === pid); return { player: pid, nickname: p.nickname, user: p.user, answer: p.user === user.id ? 'agreed' : null }; }) };
                deletionRequests.push(r2);
                if (deletionTally(r2).everyoneAgreed) close(r2, 'deleted', true);
                return send(res, 201, view(r2));
            }
            if (action === '/answer') { r.players.filter(p => p.user === user.id).forEach(p => { p.answer = json.agree ? 'agreed' : 'declined'; }); if (deletionTally(r).everyoneAgreed) close(r, 'deleted', true); return send(res, 200, view(r)); }
            if (action === '/decide') { r.note = json.note; close(r, json.delete ? 'deleted' : 'kept', false); return send(res, 200, view(r)); }
            if (req.method === 'DELETE') { r.status = 'withdrawn'; return send(res, 200, view(r)); }
        }
        if (path === '/__test/notifications' && req.method === 'POST') {
            notifications.splice(0, notifications.length,
                { id: 'nt1', kind: 'badgeEarned', title: 'You earned the badge Champion', body: 'Win a tournament of your club', link: '/badges', at: new Date().toISOString(), read: false },
                { id: 'nt2', kind: 'tournamentWon', title: 'Patch Panther wins Autumn Cup', link: '/tournaments', at: new Date().toISOString(), read: true });
            return send(res, 200, {});
        }
        if (path === '/__test/session' && req.method === 'POST') { session.expiresAt = Date.now() + json.leftMs; session.loggedIn = true; return send(res, 200, session); }
        if (path === '/api/auth/session') return session.loggedIn && session.expiresAt > Date.now() ? send(res, 200, { expiresAt: session.expiresAt, timeoutHours: sessionHours }) : send(res, 401, { message: 'Please log in.' });
        if (path === '/api/auth/session/extend') { session.expiresAt = Date.now() + sessionHours * 3600e3; return send(res, 200, { expiresAt: session.expiresAt }); }
        if (path === '/api/auth/logout') { session.loggedIn = false; mfa.loggedIn = false; return send(res, 200, { message: 'Logged out.' }); }
        if (path === '/api/auth/login') { session.loggedIn = true; session.expiresAt = Date.now() + sessionHours * 3600e3; return send(res, 200, user); }
        // quick games of the start page, kept here as the API keeps them (the results worked out from the visits)
        {
            const SERVER = ['id', '_id', 'quick', 'kind', 'createdAt', 'updatedAt'];
            const clean = (game) => Object.fromEntries(Object.entries(game ?? {}).filter(([key]) => !SERVER.includes(key)));
            const keep = (id, kind, sent, evening = quickGames.get(id)?.evening ?? null) => {
                const data = storedOf(kind, sent);
                const doc = { _id: id, kind, evening, data, gameIsRunning: data.gameIsRunning !== false, hasWinner: Boolean(data.hasWinner), createdAt: quickGames.get(id)?.createdAt ?? new Date(), updatedAt: new Date() };
                quickGames.set(id, doc);
                return quickGameView(doc);
            };
            // a darts evening with finished games, for screenshots without playing them:
            // POST /__test/evening { names? } → { id }; q1 beats q2, q3 beats q1, q2 beats q3 (301, one leg)
            if (path === '/__test/evening' && req.method === 'POST') {
                const names = json.names ?? ['Ralph Koster', 'Reto Kurz', 'Rene Krummenacher'];
                const id = `e${evenings.size + 1}`;
                const { fields } = newEvening({ name: json.name ?? '', names });
                evenings.set(id, { _id: id, ...fields, shareToken: `share${id}xyz`, createdAt: new Date(), club: null });
                const quickPlayers = fields.players.map(player => ({ id: player.id, nickname: player.name }));
                const v = (player, ...darts) => ({ player, darts });
                [['q1', 'q2'], ['q3', 'q1'], ['q2', 'q3']].forEach(([winner, loser], index) => {
                    const visits = [v(winner, 'T20', 'T20', 'T20'), v(loser, 'S20', 'S20', 'S5'), v(winner, 'T20', 'T11', 'D14')];
                    keep(`qt${index}`, 'x01', { players: [winner, loser], quickPlayers: quickPlayers.filter(player => [winner, loser].includes(player.id)), startingScore: 301, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 1, visits }, id);
                });
                return send(res, 200, { id });
            }
            // darts evenings, with the API's own report
            const gamesOfEvening = (id) => [...quickGames.values()].filter(game => game.evening === id);
            // for the global admins: the darts evenings, a quick game read without its key, a game of
            // another club (Bullseye Bern) to open, and that club to look at
            if (path === '/api/admin/evenings' && req.method === 'GET') {
                const list = [...evenings.values()].map(evening => {
                    const own = gamesOfEvening(evening._id);
                    const finished = own.filter(game => game.hasWinner).length;
                    const leader = finished ? eveningView(evening, own).report.table[0] : null;
                    return { id: evening._id, name: evening.name, players: evening.players.map(player => player.name), games: own.length, finished, running: own.some(game => game.gameIsRunning && !game.hasWinner),
                        leader: leader ? { name: leader.name, wins: leader.wins } : null, club: null, shareToken: evening.shareToken, createdAt: evening.createdAt, lastGameAt: own.at(-1)?.updatedAt ?? null };
                });
                return send(res, 200, { total: list.length, allTime: { played: 57, since: '2026-09-01T10:00:00Z' }, perDay: [{ day: new Date().toISOString().slice(0, 10), evenings: list.length }], evenings: list });
            }
            if (path === '/api/admin/evenings' && req.method === 'DELETE') {
                json.ids.forEach(id => { evenings.delete(id); gamesOfEvening(id).forEach(game => quickGames.delete(game._id)); });
                return send(res, 200, { deleted: json.ids.length });
            }
            const adminQuick = path.match(/^\/api\/admin\/quick-games\/([^/]+)(\/stats)?$/);
            if (adminQuick) {
                const game = quickGames.get(adminQuick[1]);
                if (!game) return send(res, 404, { message: 'This quick game is not there (any more).' });
                return send(res, 200, adminQuick[2] ? x01StatsOf({ ...game.data, _id: game._id }) : quickGameView(game));
            }
            if (path === '/api/admin/quick-games' && req.method === 'GET' && !process.env.ADMIN_OVERVIEWS) {
                const list = [...quickGames.values()].map(game => ({ id: game._id, kind: game.kind, format: '301 · Double Out', evening: game.evening ? { id: game.evening, name: evenings.get(game.evening)?.name ?? '', createdAt: evenings.get(game.evening)?.createdAt } : null, names: game.data.quickPlayers.map(player => player.nickname), winner: null, finished: game.hasWinner, createdAt: game.createdAt, updatedAt: game.updatedAt }));
                return send(res, 200, { total: list.length, allTime: { finished: 1234, inEvenings: 321, since: '2026-09-01T10:00:00Z' }, perDay: [], games: list });
            }
            if (path === '/api/admin/games') {
                games.set('gv1', { id: 'gv1', startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out', setMode: 'Best of', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3, players: ['p1', 'p2'], gameIsRunning: true, hasWinner: false, visits: [], createdAt: ago(0.1), updatedAt: ago(0.1) });
                return send(res, 200, [{ ...games.get('gv1'), type: 'x01', club: { id: 'k3', name: 'Bullseye Bern', logo: '' } }]);
            }
            if (path === '/api/admin/clubs/k3/visit') return send(res, 200, { id: 'k3', name: 'Bullseye Bern', country: 'CH', accent: null, joinPolicy: 'closed', admins: [], role: 'admin', visiting: true, playerCount: 4 });
            if (path === '/api/public/evenings' && req.method === 'POST') {
                const error = eveningError(json);
                if (error) return send(res, 422, { errors: [error] });
                const id = `e${evenings.size + 1}`;
                const { fields } = newEvening(json);
                const evening = { _id: id, ...fields, shareToken: `share${id}xyz`, createdAt: new Date(), club: null };
                evenings.set(id, evening);
                return send(res, 201, { evening: eveningView(evening, [], { owner: true }), key: 'mock-key' });
            }
            const evEnd = path.match(/^\/api\/public\/evenings\/(e\d+)\/end$/);
            if (evEnd && evenings.has(evEnd[1]) && req.method === 'POST') {
                const evening = evenings.get(evEnd[1]);
                evening.endedAt ??= new Date();
                return send(res, 200, eveningView(evening, gamesOfEvening(evEnd[1]), { owner: true }));
            }
            const ev = path.match(/^\/api\/public\/evenings\/(e\d+)(\/games)?$/);
            if (ev && evenings.has(ev[1])) {
                const evening = evenings.get(ev[1]);
                if (ev[2] && req.method === 'POST') {
                    if (evening.endedAt) return send(res, 409, { message: 'This evening is over. Start a new one for the next.' });
                    const error = eveningGameError(evening, json.kind, json.game);
                    if (error) return send(res, 422, { errors: [error] });
                    const id = `q${quickGames.size + 1}`;
                    return send(res, 201, { game: keep(id, json.kind, clean(json.game), ev[1]) });
                }
                return send(res, 200, eveningView(evening, gamesOfEvening(ev[1]), { owner: true }));
            }
            const evScreen = path.match(/^\/api\/public\/evenings\/(e\d+)\/screen(\/send)?$/);
            if (evScreen && evenings.has(evScreen[1])) {
                const token = `screen-token-for-evening--${evScreen[1]}`;
                if (!evScreen[2]) return send(res, 200, { token, expiresAt: new Date(Date.now() + 12 * 3600e3).toISOString() });
                const pairing = [...(globalThis.mockPairings ?? new Map()).values()].find(entry => entry.code === json.code);
                if (!pairing) return send(res, 404, { message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
                pairing.token = token;
                return send(res, 200, { sent: true });
            }
            const evShow = path.match(/^\/api\/screen\/screen-token-for-evening--(e\d+)$/);
            if (evShow && evenings.has(evShow[1])) {
                const evening = evenings.get(evShow[1]);
                const games = gamesOfEvening(evShow[1]);
                const running = [...games].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).find(game => game.gameIsRunning && !game.hasWinner);
                return send(res, 200, { kind: 'evening', evening: eveningView(evening, games), game: running ? quickGameView(running) : null, club: null, expiresAt: new Date(Date.now() + 12 * 3600e3).toISOString() });
            }
            const sh = path.match(/^\/api\/public\/evenings\/shared\/(.+)$/);
            if (sh) {
                const evening = [...evenings.values()].find(entry => entry.shareToken === sh[1]);
                return evening ? send(res, 200, eveningView(evening, gamesOfEvening(evening._id))) : send(res, 404, { message: 'This evening is not there (any more).' });
            }
            const club = path.match(/^\/api\/evenings\/(e\d+)\/club$/);
            if (club && evenings.has(club[1])) {
                evenings.get(club[1]).club = 'c9';
                return send(res, 201, { club: { id: 'c1', name: json.name }, games: gamesOfEvening(club[1]).filter(game => game.hasWinner).length });
            }
            if (path === '/api/public/quick-games' && req.method === 'POST') {
                const id = `q${quickGames.size + 1}`;
                return send(res, 201, { game: keep(id, json.kind, clean(json.game)), key: 'mock-key' });
            }
            const qg = path.match(/^\/api\/public\/quick-games\/([^/]+)$/);
            if (qg && quickGames.has(qg[1])) {
                if (req.method === 'PUT') return send(res, 200, keep(qg[1], quickGames.get(qg[1]).kind, clean(json)));
                return send(res, 200, quickGameView(quickGames.get(qg[1])));
            }
        }
        if (process.env.ADMIN_OVERVIEWS) {
            // a bigger installation: 14 clubs, 24 users, games, trainings and quick games over months
            const CLUB_NAMES = [CLUB_NAME, 'Testclub 2', 'Bullseye Bern', 'Dart Devils', 'Arrows Zürich', 'Treble Twenty', 'Double Top', 'Oche Kings', 'Flight Club', 'Checkout Crew', 'Shanghai Sharks', 'Cork Crew', 'Leg Legends', 'Quiet Corner'];
            const allClubs = CLUB_NAMES.map((name, i) => ({ id: i < 2 ? `c${i + 1}` : `k${i}`, name, logo: '' }));
            const clubsById = Object.fromEntries(allClubs.map(c => [c.id, c]));
            const rnd = (n) => { let x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
            if (path === '/api/admin/overview') return send(res, 200, { totals: { clubs: 14, users: 24, players: 120, games: 900 }, system: { environment: 'test', nodeVersion: '23', mailEnabled: false, databaseSize: 1048576, migrations: [] },
                clubs: allClubs.map((c, i) => ({ ...c, isPublic: i % 3 === 0, needsAdmin: i === 13, createdAt: ago(i === 12 ? 3 : 30 + i * 40), playerCount: Math.round(40 / (i + 1)) + 1, gameCount: i === 13 ? 0 : Math.round(400 / (i + 1)), lastActivityAt: ago(i > 10 ? 100 + i * 10 : i * 3 + 1), admins: [{ id: 'u1', firstname: 'Tess', lastname: 'User', email: 'tess@example.com', role: i === 13 ? 'globalAdmin' : 'user' }] })) });
            if (path === '/api/admin/clubs') return send(res, 200, allClubs);
            if (path === '/api/users' && req.method === 'GET') return send(res, 200, Array.from({ length: 24 }, (_, i) => ({ mfaEnabled: i % 3 === 1,
                id: `u${i + 1}`, firstname: ['Tess', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn', 'Gina', 'Hugo'][i % 8], lastname: ['User', 'Keller', 'Frei', 'Rossi', 'Graf', 'Baumann'][i % 6] + (i > 7 ? ` ${i}` : ''), email: `user${i + 1}@example.com`,
                role: i === 0 ? 'globalAdmin' : 'user', language: [null, 'de', 'de', 'fr', 'en', 'it', 'de', null][i % 8],
                clubs: i % 7 === 6 ? [] : [{ id: allClubs[i % 14].id, name: allClubs[i % 14].name, logo: '', role: i % 5 === 1 ? 'admin' : 'player' }],
                createdAt: ago(Math.round(rnd(i) * 200) + 1), lastLoginAt: i % 6 === 5 ? null : ago(i % 4 === 3 ? 200 + i : Math.round(rnd(i + 50) * 40)), blockedAt: i === 9 ? ago(4) : null,
            })));
            const daysAgoIso = (d) => new Date(Date.now() - d * 86400000).toISOString();
            if (path === '/api/admin/insights/games' || path === '/api/admin/insights/trainings') {
                const isGames = path.endsWith('games');
                const kinds = isGames ? ['x01', 'x01', 'x01', 'cricket', 'cricket', 'elimination', 'clock', 'shanghai', 'killer', 'golf'] : ['atc', 'atc', 'x01', 'bobs27', 'checkout121', 'doubles'];
                const records = Array.from({ length: isGames ? 700 : 300 }, (_, i) => {
                    const club = allClubs[Math.min(13, Math.floor(rnd(i) * rnd(i + 7) * 14))].id;
                    const age = rnd(i + 3) * 160;
                    const running = isGames && rnd(i + 11) < 0.03;
                    return { club, kind: kinds[Math.floor(rnd(i + 5) * kinds.length)], createdAt: daysAgoIso(age), updatedAt: daysAgoIso(age), running, finished: !running, playerIds: [`pl${Math.floor(rnd(i + 13) * 80)}`] };
                });
                return send(res, 200, { ...activityInsights(records), clubsById });
            }
            if (path === '/api/admin/insights/players') {
                const ps = Array.from({ length: 160 }, (_, i) => ({ clubs: i === 5 ? [] : [allClubs[Math.min(13, Math.floor(rnd(i) * rnd(i + 2) * 14))].id, ...(i % 15 === 0 ? ['c2'] : [])], guest: i % 9 === 0, user: i % 3 === 0 ? 'u' : null, createdAt: daysAgoIso(rnd(i + 4) * 300) }));
                return send(res, 200, { ...playersInsights(ps), clubsById });
            }
            if (path === '/api/admin/quick-games' && req.method === 'GET') {
                const games = Array.from({ length: 64 }, (_, i) => {
                    const kind = rnd(i) < 0.75 ? 'x01' : 'cricket';
                    const names = ['Anna', 'Ben', 'Cleo', 'Dario', 'Eva'].slice(0, 1 + Math.floor(rnd(i + 1) * 4));
                    const finished = rnd(i + 2) < 0.7;
                    const at = daysAgoIso(rnd(i + 3) * 29);
                    return { id: `q${i}`, kind, format: kind === 'x01' ? ['501 · Double Out', '301 · Double Out', '501 · Single Out'][Math.floor(rnd(i + 4) * 3)] : 'Standard', names, finished, winner: finished ? names[0] : null, createdAt: at, updatedAt: at };
                });
                const perDay = new Map();
                for (const g of games) { const d = g.createdAt.slice(0, 10); const e = perDay.get(d) ?? { day: d, games: 0, finished: 0 }; e.games++; if (g.finished) e.finished++; perDay.set(d, e); }
                return send(res, 200, { games, perDay: [...perDay.values()], total: games.length });
            }
        }
        if (path === '/api/admin/session' && req.method === 'GET') return send(res, 200, { timeoutHours: sessionHours, limits: { min: 1, max: 24, default: 5 } });
        if (path === '/api/admin/session' && req.method === 'PUT') { sessionHours = json.timeoutHours; return send(res, 200, { timeoutHours: sessionHours, limits: { min: 1, max: 24, default: 5 } }); }
        if (path === '/api/admin/overview') return send(res, 200, { totals: { clubs: 2, users: 3, players: 6, games: 2, trainings: 22 }, system: { environment: 'test', nodeVersion: '23', mailEnabled: false, databaseSize: 1048576, migrations: [] }, clubs: [
            { id: 'c1', name: CLUB_NAME, logo: '', playerCount: 6, gameCount: 40, lastActivityAt: ago(1), admins: [{ id: 'u1', firstname: 'Tess', lastname: 'User', email: 'tess@example.com' }] },
            { id: 'c2', name: 'Testclub 2', logo: '', playerCount: 3, gameCount: 4, lastActivityAt: ago(9), admins: [{ id: 'u2', firstname: 'Ben', lastname: 'Keller', email: 'ben@example.com' }] },
        ] });
        if (path === '/api/admin/banner') return send(res, 200, { enabled: false, text: '', color: '#f2b07e' });
        if (path === '/api/auth/players') return send(res, 200, players.filter(p => p.user === 'u1').map(p => ({ ...p, dateOfBirth: p.dateOfBirth ?? '1984-05-12', publicProfile: !!p.publicProfile, privateTrainings: !!p.privateTrainings, preferences: { favouriteDouble: 'auto', mainTreble: 'auto', ...(p.preferences ?? {}) }, clubs: [{ id: 'c1', name: CLUB_NAME, logo: '', isPublic: true }, { id: 'c2', name: 'Testclub 2', logo: '', isPublic: false }] })));
        const privacy = path.match(/^\/api\/players\/(p\d+)\/training-privacy$/);
        if (privacy && req.method === 'PUT') { const p = players.find(x => x.id === privacy[1]); p.privateTrainings = json.privateTrainings; return send(res, 200, p); }
        const visibility = path.match(/^\/api\/players\/(p\d+)\/visibility$/);
        if (visibility) { const p = players.find(x => x.id === visibility[1]); p.publicProfile = json.publicProfile; return send(res, 200, p); }
        const playerPut = path.match(/^\/api\/players\/(p\d+)$/);
        if (playerPut && req.method === 'PUT') {
            const p = players.find(x => x.id === playerPut[1]);
            const nick = body.match(/name="nickname"\r\n\r\n([^\r]*)/); if (nick) p.nickname = nick[1];
            if (/name="profileImg"; filename=/.test(body)) p.profileImg = 'uploaded.png';
            return send(res, 200, { message: 'Player was updated successfully.' });
        }
        if (/^\/api\/stats\/player\/p\d+$/.test(path)) return send(res, 200, { ...(process.env.FORM_CHART ? (() => {
            const months = ['2023-12', '2024-01', '2024-02', '2024-03', '2025-03', '2025-10', '2025-12', '2026-10'];
            const rates = [100, 67, 100, 100, 67, 100, 67, 43]; const avgs = [41, 36, 43, 49, 54, 44, 43, 43]; const games = [3, 3, 1, 3, 9, 1, 3, 7];
            return { form: months.map((month, i) => ({ month, games: games[i], wins: Math.round(games[i] * rates[i] / 100), winRate: rates[i], average: avgs[i] })) };
        })() : {}), playedGames: { total: 48 }, wonGames: { total: 27 }, avg: { overallX01: 52.4 }, kpis: {}, checkouts: {}, level: { level: { id: 'countyPlayer', name: 'County Player', index: 5 }, xp: 1520, progress: 31, next: { id: 'pro', name: 'Pro', missing: [{ id: 'xp', label: '480 more XP' }, { id: 'average', label: 'an X01 average of 60' }] }, breakdown: [], ladder: [], rules: {} }, trainingSummary: { total: 23, last30Days: 9, lastAt: ago(1), streak: 4,
            atc: { count: 11, fastest: { timeMs: 9842, mode: 'Double' }, fewestDarts: { darts: 34, mode: 'All' } },
            bot: { count: 6, finished: 5, wins: 3, average: 47.8, bestAverage: 58.2, recent: [41.2, 44.8, 47.1, 52.3, 58.2], checkout: { hit: 14, total: 52, rate: 26.9 }, bestDouble: { section: 16, hit: 6, total: 15, rate: 40 }, oneEighties: 2, tonPlus: 31, highestCheckout: 104, scoring: 55.1, finishing: 31.4 },
            rules: { bobs27: { count: 4, best: 1437, latest: [310, 420, 655, 1437] }, doublesaround: { count: 2, best: 21, latest: [33, 21] } } } });
        // the player comparison, made up from fixed duels but worked out by the API's own record and rating
        if (path === '/api/stats/compare/rivals/p1') {
            const who = (id) => { const p = players.find(x => x.id === id); return { id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, profileImg: '' }; };
            return send(res, 200, { mostPlayed: { playerId: 'p2', games: 14, wins: 9, losses: 5, type: 'x01', player: who('p2') }, leastPlayed: { playerId: 'p6', games: 1, wins: 0, losses: 1, type: 'cricket', player: who('p6') }, best: { playerId: 'p3', games: 6, wins: 5, losses: 1, type: 'shanghai', player: who('p3') }, worst: { playerId: 'p5', games: 4, wins: 1, losses: 3, type: 'x01', player: who('p5') }, opponents: 5, minGames: 3 });
        }
        if (path === '/api/stats/compare/opponents/p1') return send(res, 200, [{ playerId: 'p2', games: 9 }, { playerId: 'p3', games: 4 }, { playerId: 'p5', games: 2 }]);
        const mockTallies = () => Array.from({ length: 30 }, (_, i) => ({ at: new Date(2026, 5, 1 + i), players: ['p1', 'p2', 'p3'].slice(0, 2 + (i % 2)), winners: [['p1', 'p2', 'p1', 'p3'][i % 4]].filter(w => i % 2 || w !== 'p3'), friendly: false }));
        if (path === '/api/stats/compare/duel') {
            const ids = json.playerIds ?? [];
            const type = json.type ?? 'x01';
            if (process.env.NO_DUEL) return send(res, 200, { type, playedGames: 0, record: duelRecord([], ids), players: ids.map(id => ({ id, wins: 0 })), games: [], highlights: null, shame: [], ratings: {}, chances: null, filterOptions: { formats: [], clubFormats: [] }, x01: null });
            const duelGames = Array.from({ length: 14 }, (_, i) => ({ _id: `dg${i}`, updatedAt: new Date(2026, 8, 1 + i * 3), createdAt: new Date(2026, 8, 1 + i * 3), players: ids, playerModels: Object.fromEntries(ids.map((id, k) => [id, { hasWonGame: [0, 1, 1, 0, 1, 1, 1][i % 7] % ids.length === k, legsWon: { game: [0, 1, 1, 0, 1, 1, 1][i % 7] % ids.length === k ? 3 : (i % 3) }, setsWon: 0 }])) }));
            const ratings = clubRatings(mockTallies());
            const per = (values) => Object.fromEntries(ids.map((_, k) => [`player${k + 1}`, values[k % values.length]]));
            const x01 = type === 'x01' ? {
                playedGames: 14, wonGames: per([6, 8, 3, 2]), num180s: per([4, 2, 1, 0]), num160plus: per([3, 5, 1, 1]), num140plus: per([12, 9, 4, 3]),
                avg: { overall: per([58.2, 51.9, 44.3, 40.1]), dartsPerLeg: per([19.4, 21.8, 24.1, 25.6]) },
                checkouts: { hit: per([14, 22, 8, 6]), total: per([42, 54, 30, 28]), highest: per([121, 96, 80, 64]), rates: per([[], [], [], []]) },
                trend: duelGames.map((g, i) => ({ gameId: g._id, date: g.updatedAt, ...per([50 + i, 48 + (i % 4) * 2, 44, 41]) })),
                scoreRanges: [], sectionHits: [], dartsPerLeg: [], scoring: per([null, null, null, null]),
            } : null;
            const figures = { cricket: { marksPerRound: 2.1, bestMarksPerRound: 3.4, averagePoints: 120 }, elimination: { averageVisit: 41, bestVisit: 120, dartsThrown: 400 }, clock: { fewestDarts: 34, averageDarts: 52, hitRate: 38.5 }, shanghai: { pointsPerGame: 64, hitRate: 31.2, shanghais: 1 }, killer: { livesTaken: 9, livesTakenPerGame: 1.5, survived: 3 }, halveit: { pointsPerGame: 180, halvedPerGame: 1.4, bestRound: 60 }, golf: { strokesPerHole: 2.71, holesInOne: 4, bestRound: 22 }, tactics: { pointsPerGame: 85, marksPerRound: 2.3, closedPerGame: 9.5 } }[type] ?? {};
            const record = duelRecord(duelGames, ids, { type });
            return send(res, 200, {
                type, playedGames: duelGames.length, record,
                players: ids.map((id, k) => ({ id, wins: record.wins[id], ...Object.fromEntries(Object.entries(figures).map(([key, value]) => [key, Math.round(value * (1 - k * 0.12) * 100) / 100])) })),
                games: duelGames.map(g => ({ id: g._id, createdAt: g.createdAt, updatedAt: g.updatedAt, players: ids, playerModels: g.playerModels })),
                highlights: type === 'x01' ? Object.fromEntries(ids.map((id, k) => [id, { bestAverage: { value: 71.4 - k * 6, gameId: 'g1', at: new Date() }, highestCheckout: { value: 121 - k * 20, gameId: 'g1', at: new Date() }, num180s: 4 - k, total180s: 12 - k * 3 }])) : null,
                shame: process.env.SHAME_DUEL ? [['bustMaster', 'Bust Master', 1, 1], ['whitewashed', 'Whitewashed', 1, 2], ['whitewashed', 'Whitewashed', 1, 4], ['whitewashed', 'Whitewashed', 1, 9], ['bedAndBreakfast', 'Bed and Breakfast', 0, 3], ['nothingDoing', 'Nothing Doing', 1, 5], ['bottledIt', 'Bottled It', 1, 6], ['whitewashed', 'Whitewashed', 0, 7]].map(([id, title, who, day]) => ({ playerId: ids[who], id, title, description: '', count: 1, at: new Date(2026, 9, day), gameId: `dg${day}` })) : [],
                badges: Object.fromEntries(ids.map((id, k) => [id, { earned: 25 - k * 7, total: 60 - k * 12 }])),
                ratings: Object.fromEntries(ids.map(id => [id, { rating: ratings.get(id)?.rating ?? 1000, games: ratings.get(id)?.games ?? 0, provisional: (ratings.get(id)?.games ?? 0) < 5 }])),
                chances: winChances(ratings, ids),
                filterOptions: { formats: type === 'x01' ? [{ setMode: 'First to', numberOfSets: 1, legMode: 'Best of', numberOfLegs: 3 }] : [], clubFormats: type === 'x01' ? [{ id: 'f1', name: 'Club night' }] : [] },
                x01,
            });
        }
        if (path === '/api/stats/compare/side') {
            const ids = json.playerIds ?? [];
            const ratings = clubRatings(mockTallies());
            return send(res, 200, {
                players: ids.map((id, k) => ({
                    id, level: { xp: 1400 - k * 300, name: ['County Player', 'League Player', 'Club Regular', 'Pub Player'][k % 4], index: 5 - k },
                    rating: { rating: ratings.get(id)?.rating ?? 1000, games: ratings.get(id)?.games ?? 0, provisional: false },
                    badges: 30 - k * 6, games: 60 - k * 10, wins: 30 - k * 8, winRate: Math.round((30 - k * 8) / (60 - k * 10) * 1000) / 10,
                    playedGames: { x01: 40 - k * 5, cricket: 10, elimination: 4, clock: 6 - k, rules: 3 }, wonGames: { x01: 20 - k * 4, cricket: 5 - k, elimination: 2, clock: 3, rules: 1 },
                    x01: { average: 55.2 - k * 4.1, firstNine: 61.3 - k * 3, checkoutRate: 31.4 + k * 4, highestCheckout: 121 - k * 15, num180s: 6 - k * 2, tonPlus: 80 - k * 12, dartsPerLeg: 20.1 + k * 1.5, bestLeg: 15 + k * 2 },
                    cricket: { marksPerRound: 2.2 - k * 0.2, bestMarksPerRound: 3.5 - k * 0.3 }, elimination: { averageVisit: 40 - k * 3, bestVisit: 140 - k * 20 }, clock: { fewestDarts: 34 + k * 4, hitRate: 38 - k * 3 },
                    rules: { shanghai: { games: 3, wins: 2 - (k % 2) }, golf: { games: 2, wins: k % 2 } },
                    trainings: { bobs27: { count: 4, best: 230 - k * 40 }, catch40: { count: 2, best: 41 - k * 6 }, doublesaround: { count: 3, best: 48 + k * 5 } },
                })),
                chances: winChances(ratings, ids),
            });
        }
        if (path === '/api/stats/players/form') return send(res, 200, Object.fromEntries((json.playerIds ?? []).map(id => [id, { games: 12, trend: 'up', recentAverage: 55.1, previousAverage: 50.3, change: 4.8, latest: [48, 51, 50, 53, 55, 57], figures: { recent: { games: 5, visits: 61, checkoutRate: 34.8, checkoutHits: 8, checkoutAttempts: 23, tonPlus: 21.3, under10: 2.1, under30: 10.6, under50: 27.7, dartsPerLeg: 19.4, legsWon: 8, firstNine: 61.2, oneEighties: 2, oneOrFive: 14.2, shameBadges: 1 }, previous: { games: 5, visits: 66, checkoutRate: 28.1, checkoutHits: 9, checkoutAttempts: 32, tonPlus: 21.0, under10: 6.0, under30: 14.0, under50: 26.0, dartsPerLeg: 21.9, legsWon: 7, firstNine: 54.0, oneEighties: 1, oneOrFive: 17.9, shameBadges: 3 } } }])));
        const trainingPath = path.match(/^\/api\/training\/x01(?:\/([^/]+))?(\/stats)?$/);
        if (trainingPath) {
            const [, id, stats] = trainingPath;
            if (req.method === 'POST') { const t = { ...json, id: `t${++seq}`, club: 'c1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; trainings.set(t.id, t); return send(res, 201, t); }
            if (stats) return send(res, 200, { avg: [], scoreRanges: [], checkouts: {}, sectionHits: [] });
            if (req.method === 'GET' && id) return trainings.has(id) ? send(res, 200, trainings.get(id)) : send(res, 404, {});
            if (req.method === 'PUT' && id) { const t = { ...trainings.get(id), ...json, players: trainings.get(id).players, bot: trainings.get(id).bot, updatedAt: new Date().toISOString() }; trainings.set(id, t); return send(res, 200, t); }
            if (req.method === 'DELETE' && id) { trainings.delete(id); return send(res, 200, { message: 'deleted' }); }
            const withPlayer = (t) => { const p = players.find(x => t.players.includes(x.id)); return { ...t, player: p && { ...ref(p), user: p.user } }; };
            if (req.method === 'GET') return send(res, 200, [...trainings.values()].filter(t => !url.searchParams.get('player') || t.players.includes(url.searchParams.get('player'))).reverse().map(withPlayer));
        }
        if (path === '/api/auth/me') return send(res, 200, user);
        if (path === '/api/auth/config') return send(res, 200, { mailEnabled: false });
        if (path === '/api/admin/alerts') return send(res, 200, [{ id: 'a1', rule: 'manyGames', severity: 'warning', title: 'Many games in a short time', detail: '30 games in 10 minutes', at: ago(1), status: 'open', user: { id: 'u2', email: 'ben@example.com' }, ip: '10.0.0.2', club: { id: 'c1', name: CLUB_NAME } }]);
        if (path === '/api/admin/alerts/summary') return send(res, 200, { open: 1, critical: 0 });
        if (path === '/api/admin/alerts/rules') return send(res, 200, { rules: [] });
        if (path === '/api/admin/blocks') return send(res, 200, { ips: [], users: [] });
        if (path === '/api/admin/logs') {
            const m = (n) => new Date(Date.now() - n * 60000).toISOString();
            const close = (id, n) => ({ id, level: 'error', message: 'Unhandled promise rejection', error: { type: 'MongooseError', message: 'Connection.prototype.close() no longer accepts a callback', stack: 'MongooseError: Connection.prototype.close() no longer accepts a callback\n    at NativeConnection.close (/app/node_modules/mongoose/lib/connection.js:1215:11)' }, time: m(n) });
            return send(res, 200, { entries: [close('l1', 2), { id: 'l2', level: 'warn', message: 'Test mail to admin@legmate.ch by oche@kostera.ch failed: EAUTH Invalid login: 535 5.7.8 Authentication failed', time: m(9) }, close('l3', 8), close('l4', 24), close('l5', 45), close('l6', 47), close('l7', 57)], errorsToday: 6, warningsToday: 1, retentionDays: 30, limit: 500 });
        }
        if (/^\/api\/users\/[^/]+\/mfa\/reset$/.test(path)) return send(res, 200, { id: 'u2' });
        if (path === '/api/users' && req.method === 'GET') return send(res, 200, [
            { id: 'u1', firstname: 'Tess', lastname: 'User', email: 'tess@example.com', role: 'globalAdmin', clubs: [{ id: 'c1', name: CLUB_NAME }], createdAt: ago(100), lastLoginAt: ago(1) },
            { id: 'u2', firstname: 'Ben', lastname: 'Keller', email: 'ben@example.com', role: 'user', mfaEnabled: true, clubs: [{ id: 'c1', name: CLUB_NAME }], createdAt: ago(50), lastLoginAt: ago(3) },
        ]);
        if (path === '/api/admin/clubs') return send(res, 200, [
            { id: 'c1', name: CLUB_NAME, logo: '', playerCount: 6, gameCount: 40, lastActivityAt: ago(1), admins: [{ id: 'u1', firstname: 'Tess', lastname: 'User', email: 'tess@example.com' }] },
            { id: 'c2', name: 'Testclub 2', logo: '', playerCount: 3, gameCount: 4, lastActivityAt: ago(9), admins: [{ id: 'u2', firstname: 'Ben', lastname: 'Keller', email: 'ben@example.com' }] },
        ]);
        // the club's own game rules (GAME_RULES=1: a few rules to start with)
        if (process.env.GAME_RULES && !club.gameRules) club.gameRules = normalizeClubRules({
            games: { x01: { defaults: { startingScore: 501, numberOfLegs: 5, legMode: 'First to' }, offered: { startingScore: [301, 501, 701] }, locked: ['legOutMode'] }, elimination: { enabled: false }, killer: { defaults: { lives: 5, ownDouble: 'safe' }, locked: ['ownDouble'] } },
            formats: [{ id: 'club-night', game: 'x01', name: 'Club night', settings: { startingScore: 501, legMode: 'First to', numberOfLegs: 3 } }, { id: 'warm-up', game: 'x01', name: 'Warm-up', settings: { startingScore: 301, numberOfLegs: 1, legMode: 'First to' }, friendly: true }],
            handicap: { mode: 'offered', maxDifference: 200 },
        });
        if (path === '/api/auth/game-preferences' && req.method === 'PUT') {
            const before = normalizeGamePreferences(user.gamePreferences);
            const setups = { ...before.setups };
            for (const [clubId, games] of Object.entries(json.setups ?? {})) setups[clubId] = { ...setups[clubId], ...games };
            user.gamePreferences = normalizeGamePreferences({ ...before, ...json, setups });
            return send(res, 200, user);
        }
        if (path === '/api/clubs/c1/game-rules' && req.method === 'PUT') {
            club.gameRules = normalizeClubRules(json);
            return send(res, 200, club);
        }
        const gameCreate = path.match(/^\/api\/games\/(x01|cricket|elimination|clock|rules)$/);
        if (gameCreate && req.method === 'POST' && club.gameRules) {
            const problems = ruleViolations(gameCreate[1] === 'rules' ? json.kind : gameCreate[1], club.gameRules, json);
            if (problems.length) return send(res, 422, { errors: problems, message: problems.join(' ') });
        }
        // the club's own badges, worked out by the API's replay from made-up games
        if (process.env.CLUB_BADGES && !globalThis.clubBadgeData) {
            const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
            const events = Array.from({ length: 130 }, (_, i) => ({ kind: 'game', type: ['x01', 'cricket', 'shanghai', 'killer'][i % 4], id: `cg${i}`, at: new Date(Date.UTC(2026, 6, 6 + Math.floor(i / 4) * 2, 18, i)), players: [ids[i % 8], ids[(i + 3) % 8]], darts: 60, num180s: i % 9 === 0 ? 1 : 0, tonPlus: 3, highFinishes: i % 20 === 0 ? 1 : 0, firsts: i === 9 ? { max180: ['p2'] } : {} }));
            const { earned, metrics } = replayClubBadges(events, { members: 12, createdAt: new Date(2024, 8, 1) });
            const nick = { p1: 'Anna', p2: 'Ben', p3: 'Cleo' };
            club.badges = topClubBadges(earned.map(e => ({ ...e, nickname: nick[e.player] ?? null })));
            club.badgeCount = earned.length;
            const goals = [{ id: 'goal1', metric: 'num180s', target: 50, from: new Date(2026, 6, 1), until: new Date(2026, 11, 31), reachedAt: null }];
            globalThis.clubBadgeData = { earned, metrics, events, goals, nick };
        }
        const clubOwn = () => {
            const { earned, metrics, events, goals, nick } = globalThis.clubBadgeData;
            const byId = new Map(earned.map(e => [e.badge, e]));
            return {
                earnedCount: earned.length, total: CLUB_BADGES.length,
                badges: CLUB_BADGES.map(b => { const e = byId.get(b.id); return { ...publicClubBadge(b), earned: e ? { earnedAt: e.earnedAt, sourceType: e.sourceType, sourceId: e.sourceId, nickname: nick[e.player] ?? null } : null, progress: Math.min(metrics[b.metric] ?? 0, b.target) }; }),
                goals: goals.map(g => ({ ...g, title: GOAL_METRICS[g.metric].title, description: GOAL_METRICS[g.metric].describe(g.target), progress: Math.min(goalProgress(g, events, []), g.target) })),
            };
        };
        if (path === '/api/stats/club-badges' && process.env.CLUB_BADGES) return send(res, 200, clubOwn());
        if (path === '/api/clubs/c1/goals' && req.method === 'PUT') {
            globalThis.clubBadgeData.goals = json.goals.map((g, i) => ({ id: g.id ?? `goal-new-${i}`, metric: g.metric, target: g.target, from: new Date(2026, 6, 1), until: g.until, reachedAt: null }));
            return send(res, 200, clubOwn().goals);
        }
        if (path === '/api/clubs') return send(res, 200, [process.env.SHAME_DASH ? { ...club, dashboardWidgets: ['hallOfShame'] } : club, { ...club, id: 'c2', name: 'Testclub 2', country: 'IT' }]);
        if (path === '/api/stats/club' && process.env.DASH !== '0') {
            const members = players.map(p => ({ _id: p.id, ...p }));
            const board = (value) => players.slice(0, 5).map((p, i) => ({ player: p.id, value: value(i) }));
            return send(res, 200, {
                club: { id: 'c1', name: CLUB_NAME, description: 'Darts every Thursday', logo: null, createdAt: ago(400), isPublic: true, playerCount: 6, adminCount: 1, ...(globalThis.clubBadgeData ? { latestBadges: latestClubBadges(globalThis.clubBadgeData.earned), badgeCount: globalThis.clubBadgeData.earned.length, badgeTotal: CLUB_BADGES.length } : {}) },
                totals: { gamesPlayed: 48, running: 4, x01: 30, cricket: 10, elimination: 5, clock: 3, lastGameAt: ago(1) },
                players: players.map(p => ({ id: p.id, firstname: p.firstname, lastname: p.lastname, nickname: p.nickname, profileImg: '', guest: false })),
                leaderboards: { mostWins: board(i => 20 - i * 3), winRate: board(i => 60 - i * 5), x01Average: board(i => 55 - i * 4), most180s: board(i => 9 - i), highestCheckout: board(i => 140 - i * 10), mostGames: board(i => 40 - i * 4), winsX01: board(i => 12 - i), winsCricket: board(i => 5 - i), winsElimination: board(i => 3), winsClock: board(i => 2), mostDarts: board(i => 4000 - i * 300) },
                recentGames: [
                    { id: 'r1', type: 'x01', playedAt: ago(0.02), running: true, format: '501 · Best of 3 sets · Best of 3 legs', players: [{ player: 'p1', sets: 1, legs: 2 }, { player: 'p2', sets: 0, legs: 1 }] },
                    { id: 'r2', type: 'cricket', playedAt: ago(1), running: false, format: 'Cricket', players: [{ player: 'p2', score: 120, isWinner: true }, { player: 'p3', score: 65 }] },
                    { id: 'r3', type: 'elimination', playedAt: ago(1.1), running: false, format: 'Target 301', players: [{ player: 'p1', score: 301, isWinner: true }, { player: 'p4', score: 145 }] },
                    { id: 'r4', type: 'clock', playedAt: ago(2), running: false, format: 'Around the Clock · All', players: [{ player: 'p3', isWinner: true }, { player: 'p5' }] },
                    { id: 'r5', type: 'x01', playedAt: ago(2.1), running: false, format: '501 · First to 1 set · First to 1 leg', players: [{ player: 'p1', sets: 1, legs: 1, isWinner: true }, { player: 'p2', sets: 0, legs: 0 }] },
                ],
                runningGames: [
                    { id: 'r1', type: 'x01', playedAt: ago(0.02), players: [{ player: 'p1', sets: 1, legs: 2 }, { player: 'p2', sets: 0, legs: 1 }] },
                    { id: 'r6', type: 'elimination', playedAt: ago(3), players: [{ player: 'p2', score: 0 }, { player: 'p1', score: 294 }, { player: 'p6', score: 145 }] },
                    { id: 'r7', type: 'cricket', playedAt: ago(30), players: [{ player: 'p1', score: 20 }, { player: 'p2', score: 0 }] },
                    { id: 'r8', type: 'clock', playedAt: ago(40), players: [{ player: 'p3' }, { player: 'p4' }] },
                ],
                kpis: clubKpis({ finishedByType: [{ type: 'x01', games: [] }, { type: 'cricket', games: [] }, { type: 'elimination', games: [] }, { type: 'clock', games: [] }], allGames: [], members }),
                headToHead: h2h([{ type: 'x01', games: [] }], new Set(players.map(p => p.id))),
                records: clubRecords([]),
                gameLog: gameLog([]),
            });
        }
        if (path === '/api/auth/me' && req.method === 'GET') return send(res, 200, user);
        if (path === '/api/auth/language' && req.method === 'PUT') { user.language = json.language; console.log('LANGUAGE', json.language, req.headers['accept-language']); return send(res, 200, user); }
        const dash = path.match(/^\/api\/auth\/dashboard\/(c\d+)$/);
        if (dash && req.method === 'PUT') { user.dashboards = [...(user.dashboards ?? []).filter(d => d.club !== dash[1]), ...(Array.isArray(json.layout) ? [{ club: dash[1], layout: json.layout }] : [])]; return send(res, 200, user); }
        const clubPut = path.match(/^\/api\/clubs\/(c\d+)$/);
        if (clubPut && req.method === 'PUT') { const { dashboardLayout, ...rest } = json; Object.assign(club, rest); if (Array.isArray(dashboardLayout)) club.dashboardLayout = dashboardLayout; return send(res, 200, club); }
        if (path === '/api/stats/club' && process.env.SHAME_DASH) return send(res, 200, { club: { name: CLUB_NAME, createdAt: new Date(), playerCount: 6, adminCount: 1 }, totals: { gamesPlayed: 3, lastGameAt: new Date(), running: 0 }, players: [] });
        if (path === '/api/players/last-played') return send(res, 200, {});
        if (process.env.PLAYERS_PAGE && path === '/api/players/search') {
            const day = (offset) => new Date(Date.now() + offset * 86400000);
            const birth = (offset, year) => `${year}-${day(offset).toISOString().slice(5, 10)}T00:00:00.000Z`;
            const extra = [[0, 1990, 2], [5, 1985, 400], [12, 2001, 40], [null, null, 9], [60, 1978, 700], [null, null, 120]];
            return send(res, 200, [...players.map((p, i) => ({ ...p, createdAt: day(-extra[i][2]).toISOString(), dateOfBirth: extra[i][0] === null ? undefined : birth(extra[i][0], extra[i][1]) })),
                { id: 'g1', nickname: 'Gast Gustav', firstname: 'Gast Gustav', lastname: 'Guest', guest: true, clubs: ['c1'], createdAt: day(-3).toISOString() }]);
        }
        if (process.env.PLAYERS_PAGE && path === '/api/stats/levels') {
            const xp = [5200, 380, 1450, 90, 2600, 380];
            return send(res, 200, Object.fromEntries(players.map((p, i) => {
                const level = [...LEVELS].reverse().find(l => xp[i] >= (l.xp ?? 0)) ?? LEVELS[0];
                return [p.id, { id: level.id, name: level.name, index: LEVELS.indexOf(level) + 1, xp: xp[i] }];
            })));
        }
        if (path === '/api/players' || path === '/api/players/search') return send(res, 200, players);
        if (path === '/api/training/atc' && req.method === 'GET') {
            const scoring = url.searchParams.get('scoring'); const mode = url.searchParams.get('mode');
            return send(res, 200, entries.filter(e => (!mode || e.mode === mode) && (!scoring || (scoring === 'Darts' ? e.scoring === 'Darts' : e.scoring !== 'Darts'))));
        }
        const atcOne = path.match(/^\/api\/training\/atc\/(e\d+)$/);
        if (atcOne && req.method === 'DELETE') { const i = entries.findIndex(e => e.id === atcOne[1]); if (i >= 0) entries.splice(i, 1); return send(res, 200, { message: 'deleted' }); }
        if (path === '/api/training/atc' && req.method === 'POST') {
            const p = players.find(x => x.id === json.player?.id);
            const field = json.scoring === 'Darts' ? 'darts' : 'timeMs';
            const own = entries.filter(e => e.player.id === p.id && e.mode === json.mode && (e.scoring ?? 'Time') === (json.scoring ?? 'Time'));
            const best = Math.min(...own.map(e => e[field]));
            const entry = { id: `e${++seq}`, ...json, player: ref(p), createdAt: new Date().toISOString() };
            entries.push(entry);
            return setTimeout(() => send(res, 201, { ...entry, isRecord: own.length > 0 && entry[field] < best, newBadges: [] }), 300);
        }
        if (path === '/api/players/checkout-profiles') {
            // Anna: D20 learned from her games; the others without enough darts
            const profiles = Object.fromEntries((json.playerIds ?? []).map(id => {
                const player = players.find(p => p.id === id);
                const set = player?.preferences?.favouriteDouble;
                const learnedDouble = id === 'p1' ? 'D20' : null;
                const doubleOrder = set && set !== 'auto' ? [set, ...(learnedDouble && learnedDouble !== set ? [learnedDouble] : [])] : learnedDouble ? ['D20', 'D16'] : [];
                return [id, {
                    doubles: learnedDouble ? [{ double: 'D20', hit: 12, total: 30, rate: 40 }, { double: 'D16', hit: 5, total: 20, rate: 25 }] : [],
                    doubleDarts: learnedDouble ? 50 : 0, doubleOrder, favouriteDouble: doubleOrder[0] ?? null,
                    doubleSource: set && set !== 'auto' ? 'set' : learnedDouble ? 'history' : null,
                    mainTreble: player?.preferences?.mainTreble && player.preferences.mainTreble !== 'auto' ? player.preferences.mainTreble : null,
                    trebleSource: player?.preferences?.mainTreble && player.preferences.mainTreble !== 'auto' ? 'set' : null,
                    learnedDouble, learnedTreble: null,
                }];
            }));
            return send(res, 200, profiles);
        }
        const sh = path.match(/^\/api\/players\/(p\d+)\/shirt$/);
        if (sh) {
            const p = players.find(x => x.id === sh[1]);
            p.bestLevel ??= Number(process.env.SHIRT_LEVEL ?? 6);
            if (req.method === 'PUT') { const c = shirtCheck(p, json, p.bestLevel); if (!c.ok) return send(res, 409, { message: c.reason }); p.shirt = c.shirt; }
            return send(res, 200, shirtStanding(p, { levels: LEVELS }));
        }
        const fl = path.match(/^\/api\/players\/(p\d+)\/flights(\/unlock)?$/);
        if (fl) {
            const p = players.find(x => x.id === fl[1]);
            const standing = () => flightStanding({ counts: { games: 30, wins: 12, trainings: 10, botTrainings: 4, botWins: 2, num180s: 3, highFinishes: 2, bigFishes: 1 }, levelIndex: 4, average: 52.4, unlocked: p.unlocked ?? [], levels: LEVELS });
            if (fl[2]) { const c = unlockCheck(standing(), json.kind, json.id); if (!c.ok) return send(res, 409, { message: c.reason }); p.unlocked = [...(p.unlocked ?? []), c.key]; }
            return send(res, 200, standing());
        }
        const prefs = path.match(/^\/api\/players\/(p\d+)\/preferences$/);
        if (prefs && req.method === 'PUT') {
            const player = players.find(p => p.id === prefs[1]);
            player.preferences = { favouriteDouble: 'auto', mainTreble: 'auto', ...player.preferences, ...json };
            return send(res, 200, player);
        }
        const one = path.match(/^\/api\/players\/(p\d+)$/);
        if (one) { const p = players.find(x => x.id === one[1]); p.bestLevel ??= Number(process.env.SHIRT_LEVEL ?? 6); return send(res, 200, { ...p, shirt: shirtOf(p) }); }
        if (path === '/api/players/find') return send(res, 200, players.filter(p => (json.playerIds ?? []).includes(p.id)));
        // the rules engine: Shanghai, Killer, … and Bob's 27, …
        const rg = path.match(/^\/api\/games\/rules(?:\/([^/]+))?$/);
        if (rg) {
            const [, id] = rg;
            if (req.method === 'POST' && !id) { const game = { ...json, type: json.kind, id: `g${++seq}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; games.set(game.id, game); return send(res, 201, game); }
            if (req.method === 'GET' && id) return games.has(id) ? send(res, 200, games.get(id)) : send(res, 404, {});
            if (req.method === 'PUT' && id) { const game = { ...games.get(id), ...json, updatedAt: new Date().toISOString() }; games.set(id, game); return send(res, 200, game); }
            if (req.method === 'DELETE' && id) { games.delete(id); return send(res, 200, {}); }
            if (req.method === 'GET') return send(res, 200, [...games.values()].filter(g => g.kind));
        }
        globalThis.rulesTrainings = globalThis.rulesTrainings ?? [];
        const rt = path.match(/^\/api\/(?:training\/rules|admin\/rules-trainings)(?:\/([^/]+))?$/);
        if (rt) {
            const list = globalThis.rulesTrainings;
            if (req.method === 'POST') {
                const same = list.filter(e => e.kind === json.kind && e.player.id === json.player.id);
                const lower = json.kind === 'doublesaround';
                const best = same.length ? (lower ? Math.min(...same.map(e => e.score)) : Math.max(...same.map(e => e.score))) : null;
                const entry = { ...json, id: `t${++seq}`, player: { id: json.player.id, nickname: players.find(p => p.id === json.player.id)?.nickname ?? '?' }, createdAt: new Date().toISOString() };
                list.unshift(entry);
                return send(res, 201, { ...entry, isRecord: best !== null && (lower ? json.score < best : json.score > best), previousBest: best, newBadges: process.env.BADGE ? [{ id: 'one-two-one', title: 'One-Two-One', description: 'Check out 121', group: 'training', tier: 1, tiers: 3 }] : [] });
            }
            if (req.method === 'DELETE') { const i = list.findIndex(e => e.id === rt[1]); if (i >= 0) list.splice(i, 1); return send(res, 200, {}); }
            const kind = url.searchParams.get('kind');
            return send(res, 200, list.filter(e => !kind || e.kind === kind));
        }
        // the big screen: a link from the game, and the game for the screen (the token is the game's id, padded)
        const screenLink = path.match(/^\/api\/games\/(x01|cricket|elimination|clock|rules)\/([^/]+)\/screen$/);
        // the token says the kind (X01 as before: just the id)
        const tokenFor = (kind, id) => (kind === 'x01' ? `screen-token-for-${id}` : `screen-token-for-${kind}--${id}`);
        if (screenLink && req.method === 'POST') return send(res, 200, { token: tokenFor(screenLink[1], screenLink[2]), expiresAt: new Date(Date.now() + 12 * 3600e3).toISOString() });
        // a TV paired by its code
        globalThis.mockPairings ??= new Map();
        if (path === '/api/screen/pairings' && req.method === 'POST') {
            const pairing = { secret: `tv-secret-${Date.now()}-${Math.random().toString(36).slice(2)}`, code: String(100000 + globalThis.mockPairings.size + 23456).slice(0, 6), expiresAt: new Date(Date.now() + 12 * 3600e3).toISOString(), token: null };
            globalThis.mockPairings.set(pairing.secret, pairing);
            return send(res, 201, pairing);
        }
        const pairingShow = path.match(/^\/api\/screen\/pairings\/([^/]+)$/);
        if (pairingShow) {
            const pairing = globalThis.mockPairings.get(decodeURIComponent(pairingShow[1]));
            return pairing ? send(res, 200, { code: pairing.code, expiresAt: pairing.expiresAt, token: pairing.token }) : send(res, 404, { message: 'This TV is not paired any more.', expired: true });
        }
        const screenSend = path.match(/^\/api\/games\/(?:x01|cricket|elimination|clock|rules)\/([^/]+)\/screen\/send$/);
        if (screenSend) {
            const pairing = [...globalThis.mockPairings.values()].find(entry => entry.code === json.code);
            if (!pairing) return send(res, 404, { message: 'No TV shows this code. Check the code on the TV, or open /tv there again.' });
            pairing.token = `screen-token-for-${screenSend[1]}`;
            return send(res, 200, { sent: true });
        }
        const screenShow = path.match(/^\/api\/screen\/screen-token-for-(?:(cricket|elimination|clock|rules)--)?([^/]+)$/);
        if (screenShow) {
            const game = games.get(screenShow[2]);
            if (!game) return send(res, 404, { message: 'This big screen link is not valid any more. Open a new one from the game.', expired: true });
            return send(res, 200, { kind: screenShow[1] ?? 'x01', game, players: players.filter(p => (game.players ?? []).includes(p.id)).map(p => ({ id: p.id, nickname: p.nickname, country: p.country, shirt: shirtOf(p) })), club: { name: CLUB_NAME, logo: '', accent: null }, expiresAt: new Date(Date.now() + 12 * 3600e3).toISOString() });
        }
        const clock = path.match(/^\/api\/games\/(?:clock|x01|cricket|elimination)(?:\/([^/]+))?$/);
        if (clock) {
            const [, id] = clock;
            if (req.method === 'POST' && !id) { const game = { ...json, id: `g${++seq}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; games.set(game.id, game); return send(res, 201, game); }
            if (req.method === 'GET' && id) return games.has(id) ? send(res, 200, games.get(id)) : send(res, 404, {});
            if (req.method === 'PUT' && id) { const game = { ...games.get(id), ...json, updatedAt: new Date().toISOString() }; games.set(id, game); return send(res, 200, game); }
            if (req.method === 'GET') return send(res, 200, path.includes('/x01') ? [...games.values()].filter(g => !g.deleted) : []);
        }
        if (path === '/api/stats/shame') {
            const holders = { madhouse: players[0], bedAndBreakfast: players[2], coldSpell: players[2], bustMaster: players[1] };
            return send(res, 200, { enabled: true, badges: SHAME_BADGES.map(({ metric, washMetric, ...b }) => ({ ...b, holder: holders[b.id] ? ref(holders[b.id]) : null, since: new Date(Date.now() - 3 * 864e5), sourceType: 'x01', sourceId: 'g1' })) });
        }
        if (path === '/api/integrity/delete' && req.method === 'POST') {
            let deleted = 0;
            for (const { id } of json.items ?? []) { const index = entries.findIndex(e => e.id === id); if (index >= 0) { entries.splice(index, 1); deleted++; } if (games.delete(id)) deleted++; }
            return send(res, 200, { deleted, skipped: 0 });
        }
        // notification settings, unsubscribe and claim links (NOTIFY=1 checks)
        if (globalThis.mockLoggedOut && path === '/api/auth/me') return send(res, 401, { message: 'Not logged in' });
        if (path === '/api/notifications/settings') {
            if (req.method === 'PUT') notificationPrefs = { ...notificationPrefs, ...normalizePreferences(json) };
            const audience = user.role === 'globalAdmin' ? ['globalAdmin', 'everyone'] : ['player', 'everyone', 'clubAdmin'];
            const groups = NOTIFICATION_GROUPS.filter(g => audience.includes(g.audience)).map(g => g.id);
            return send(res, 200, { mailEnabled: !process.env.NO_MAIL, groups, topics: NOTIFICATION_TOPICS.filter(t => groups.includes(t.group)).map(t => ({ id: t.id, group: t.group, locked: Boolean(t.locked), mailOnly: Boolean(t.mailOnly), mails: t.mails ?? ['off', 'instant', 'daily', 'weekly'], ...preferenceOf(notificationPrefs, t.id) })) });
        }
        if (path === '/api/unsubscribe') {
            if (url.searchParams.get('token') !== 'good' && url.searchParams.get('token') !== 'contact') return send(res, 404, { message: 'This link is not valid.' });
            return send(res, 200, { type: url.searchParams.get('token') === 'contact' ? 'contact' : 'user', topic: 'all' });
        }
        const claimPath = path.match(/^\/api\/claim\/([^/]+)$/);
        if (claimPath) {
            if (claimPath[1] !== 'tok123') return send(res, 404, { message: 'This link is not valid any more. Ask an admin of your club for a new one.' });
            if (req.method === 'POST') return send(res, 200, { club: 'c1', player: 'p3', nickname: 'Sammy' });
            return send(res, 200, { nickname: 'Sammy', firstname: 'Sam', club: { id: 'c1', name: CLUB_NAME, logo: '' } });
        }
        const contactPath = path.match(/^\/api\/players\/([^/]+)\/(contact|claim|account\/invite)$/);
        if (contactPath) {
            const [, , what] = contactPath;
            if (what === 'account/invite') return send(res, 200, { message: 'The invitation was sent again.' });
            if (what === 'claim' && req.method === 'POST') { claimCount += 1; return send(res, 201, { link: 'http://localhost:5199/claim/tok123', days: 30, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), claims: { count: claimCount, until: new Date(Date.now() + 30 * 864e5).toISOString() } }); }
            if (what === 'claim') { claimCount = 0; return send(res, 200, { claims: { count: 0, until: null } }); }
            if (req.method === 'PUT') contactOf = { email: json.email, language: json.language, topics: json.topics, consentAt: new Date().toISOString(), consentByName: 'Test User', unsubscribedAt: null };
            if (req.method === 'DELETE') contactOf = null;
            return send(res, 200, { contact: contactOf, claims: { count: claimCount, until: claimCount ? new Date(Date.now() + 30 * 864e5).toISOString() : null }, mailEnabled: !process.env.NO_MAIL });
        }
        if (path === '/api/notifications' && req.method === 'DELETE') { const deleted = notifications.length; notifications.length = 0; return send(res, 200, { deleted }); }
        if (path === '/api/notifications') return send(res, 200, { notifications, unread: notifications.filter(n => !n.read).length });
        if (path === '/api/notifications/unread') return send(res, 200, { unread: notifications.filter(n => !n.read).length });
        if (path === '/api/notifications/read') { notifications.forEach(n => { n.read = true; }); return send(res, 200, {}); }
        const notice = path.match(/^\/api\/notifications\/(\w+)(\/read)?$/);
        if (notice) {
            const index = notifications.findIndex(n => n.id === notice[1]);
            if (notice[2]) notifications[index].read = true; else notifications.splice(index, 1);
            return send(res, 200, {});
        }
        if (path === '/api/integrity/summary') {
            const count = { impossible: 0, errors: 0, suspicious: 0 };
            const list = await listEntries(url);
            list.forEach(e => { if (e.level === 'impossible' && e.review?.status !== 'ok') count.impossible++; else if (e.level === 'error' && !e.review) count.errors++; else if (e.level === 'suspicious' && !e.review) count.suspicious++; });
            return send(res, 200, { ...count, open: count.impossible + count.errors + count.suspicious });
        }
        if (path === '/api/integrity' && req.method === 'GET') return send(res, 200, { entries: await listEntries(url), thresholds: THRESHOLDS });
        if (path === '/api/integrity/birth/b1/restore') { birthRestored = true; return send(res, 200, { restored: true }); }
        if (path === '/api/integrity/birth/b1' && req.method === 'GET') return send(res, 200, { type: 'birth', findings: checkBirthChange(birthChange, { minAge: 16, gameDates: [] }), facts: [['Before', birthChange.from.toISOString()], ['Changed to', birthChange.to.toISOString()], ['Changed on', birthChange.at.toISOString()], ['Age limit of the club', '16 years']] });
        const repairPath = path.match(/^\/api\/integrity\/x01\/([^/]+)\/repair$/);
        if (repairPath) {
            const game = games.get(repairPath[1]);
            const fixed = repairX01(game);
            if (!fixed.possible) return send(res, 409, { message: `It cannot be repaired: ${fixed.reason}.` });
            game.allSetsThrows = fixed.allSetsThrows;
            return send(res, 200, { repaired: fixed.changed });
        }
        const detailPath = path.match(/^\/api\/integrity\/(\w+)\/([^/]+)$/);
        if (detailPath && req.method === 'GET') {
            const [, type, id] = detailPath;
            const fresh = process.env.FP_NEW && fpNewItems().find(item => item.id === id);
            if (fresh && type === 'rules') return send(res, 200, { type, findings: fresh.findings, visits: fresh.doc.visits.map(v => ({ playerId: v.player, darts: v.darts, roundScore: null, scoreLeft: null })) });
            if (fresh) return send(res, 200, { type, findings: fresh.findings, facts: [['Training', "Bob's 27"], ['Score', '1200'], ['Darts', '63'], ['Saved', fresh.doc.createdAt.toISOString()]] });
            if (type === 'training') {
                const e = entries.find(x => x.id === id);
                return send(res, 200, { type, findings: compact(checkTraining({ ...e, scoring: e.scoring ?? 'Time' })), facts: [['Mode', e.mode], ['Scoring', e.scoring === 'Darts' ? 'Fewest darts' : 'Against the clock'], e.scoring === 'Darts' ? ['Darts', String(e.darts)] : ['Time', `${(e.timeMs / 100).toFixed(2)} s`], ...(e.dartsPerTarget ? [['Darts per target', e.dartsPerTarget.join(' · ')]] : []), ['Saved', e.createdAt]] });
            }
            const g = games.get(id);
            const f = compact(checkX01(g));
            const repair = levelOf(f) === 'error' ? repairX01(g) : null;
            return setTimeout(() => send(res, 200, { type, findings: f, legs: x01Legs(g), ...(repair ? { repairable: repair.possible, repairReason: repair.possible ? '' : repair.reason } : {}) }), 200);
        }
        const integrity = path.match(/^\/api\/integrity\/(\w+)\/([^/]+)(\/review)?$/);
        if (integrity) {
            const [, , id, isReview] = integrity;
            if (isReview) { const r = { status: json.status, reason: json.reason ?? '', byName: 'Test User', at: new Date().toISOString() }; reviews.set(id, r); return send(res, 200, r); }
            const index = entries.findIndex(e => e.id === id); if (index >= 0) entries.splice(index, 1); games.delete(id);
            return send(res, 200, { message: 'Deleted.' });
        }
        if (path === '/api/badges') return send(res, 200, { categories: realCategories, badges: realBadges.map(({ metric, ...b }) => b), shame: SHAME_BADGES.map(({ metric, washMetric, ...b }) => b), club: { categories: [], badges: CLUB_BADGES.map(publicClubBadge) }, levels: LEVELS, xpRules: XP_RULES, flights: { pointRules: POINT_RULES, rarities: RARITIES, items: Object.entries(CATALOG).flatMap(([kind, items]) => items.map(({ id, label, rarity, cost, level, average, feat }) => ({ kind, id, label, rarity, cost: cost ?? null, level: level ?? null, average: average ?? null, feat: feat ? FEATS[feat].label : null }))) } });
        if (/^\/api\/stats\/player\/p\d+\/games$/.test(path)) return send(res, 200, { total: 0, games: [], players: [] });
        if (path === '/api/stats/games') {
            const ids = players.map(p => p.id);
            const make = (n, kind) => {
                const two = [ids[n % ids.length], ids[(n * 3 + 1) % ids.length]].filter((id, i, all) => all.indexOf(id) === i);
                const winner = n % 7 === 0 ? null : two[n % two.length];
                return { players: two, kind, createdAt: new Date(Date.now() - (n * 2) * 864e5), hasWinner: Boolean(winner), gameIsRunning: !winner, playerModels: Object.fromEntries(two.map(id => [id, { hasWonGame: id === winner }])) };
            };
            const byType = [
                { type: 'x01', games: Array.from({ length: 40 }, (_, n) => make(n)) },
                { type: 'cricket', games: Array.from({ length: 14 }, (_, n) => make(n + 3)) },
                { type: 'clock', games: Array.from({ length: 6 }, (_, n) => make(n + 5)) },
                { type: 'rules', games: Array.from({ length: 5 }, (_, n) => make(n + 1, n % 2 ? 'golf' : 'shanghai')) },
            ];
            return send(res, 200, { ...gamesOverview(byType, new Set(ids)), playersById: Object.fromEntries(players.map(p => [p.id, { id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, profileImg: p.profileImg }])) });
        }
        if (path === '/api/stats/badges') {
            const pick = (ids, days) => ids.map((index, i) => ({ badge: realBadges[index].id, earnedAt: new Date(Date.now() - (days + i * 3) * 864e5) }));
            const sample = players.map((p, n) => ({ _id: p.id, nickname: p.nickname, firstname: p.firstname, lastname: p.lastname, profileImg: p.profileImg,
                badges: n === 0 ? pick([0, 1, 2, 5, 6, 10, 11, 15, 20, 21, 30], 1) : n === 1 ? pick([0, 1, 5, 10, 15, 40], 2) : n === 2 ? pick([0, 5, 60], 4) : n === 3 ? pick([0], 50) : [],
                activity: { lastWeek: '2026-W43', weekStreak: 2, bestWeekStreak: 4 } }));
            // a big club: 150 players more
            const many = process.env.MANY ? Array.from({ length: 150 }, (_, n) => ({ _id: `m${n}`, nickname: `Player ${n + 1}`, firstname: 'Player', lastname: String(n + 1), profileImg: '',
                badges: pick(Array.from({ length: n % 9 }, (_, i) => i * 3), 5 + n), activity: { bestWeekStreak: n % 5 } })) : [];
            return send(res, 200, clubBadgeOverview([...sample, ...many]));
        }
        if (path.startsWith('/api/stats/badges/player/') && process.env.SHAME_PROFILE) {
            const counts = { bedAndBreakfast: [4, true], stuckOnTheDouble: [1, false], whitewashed: [1, false], ...(process.env.SHAME_PROFILE === 'two' ? { madhouse: [2, true] } : {}) };
            const shame = SHAME_BADGES.map(({ metric, washMetric, ...b }) => ({ ...b, count: counts[b.id]?.[0] ?? 0, active: process.env.SHAME_PROFILE === 'none' ? false : (counts[b.id]?.[1] ?? false), lastAt: '2026-10-15', washedAt: counts[b.id] && (process.env.SHAME_PROFILE === 'none' || !counts[b.id][1]) ? '2026-03-03' : null }));
            const badges = realBadges.map(({ metric, ...b }) => ({ ...b, earned: b.tier === 1 ? { earnedAt: '2026-01-01' } : null, progress: 0 }));
            return send(res, 200, { player: ref(players[0]), categories: realCategories, badges, earnedCount: badges.filter(b => b.earned).length, total: badges.length, shame });
        }
        if (path.startsWith('/api/stats/badges/player/')) {
            const mk = (group, groupTitle, tiers, earned) => Array.from({ length: tiers }, (_, i) => ({ id: group + i, group, groupTitle, category: 'x01', title: groupTitle + ' ' + (i + 1), description: 'Sample', tier: i + 1, tiers, earned: i < earned, progress: 3, target: 10 }));
            const badges = [...mk('max180', '180s', 6, 6), ...mk('wins', 'Wins', 4, 2), ...mk('nineDarter', 'Nine-darter', 1, 0)];
            return send(res, 200, { categories: [{ category: 'x01', title: 'X01' }], badges, earnedCount: 8, total: badges.length });
        }
        if (path.startsWith('/api/stats/badges/game/') && process.env.SHAME_GAME) {
            const pick = (...ids) => SHAME_BADGES.filter(b => ids.includes(b.id)).map(({ metric, washMetric, ...b }) => b);
            return send(res, 200, { finished: true, players: [{ player: 'p1', badges: realBadges.filter(b => b.id === 'clockWins-1') }], shame: [
                { player: 'p2', got: pick('woodenSpoon', 'coldSpell').map(b => ({ ...b, count: 1 })), washed: [] },
                { player: 'p1', got: [], washed: pick('madhouse') },
            ] });
        }
        if (path.startsWith('/api/stats/badges/game/')) return send(res, 200, { finished: true, players: [], club: process.env.CLUB_BADGES ? [{ ...publicClubBadge(CLUB_BADGES.find(b => b.id === 'clubGames-100')), earnedAt: new Date(), nickname: 'Anna' }] : [] });
        console.log('unhandled', req.method, path);
        send(res, 200, req.method === 'GET' ? [] : {});
    });
}).listen(Number(process.env.MOCK_PORT) || 3901, () => console.log(`mock on ${Number(process.env.MOCK_PORT) || 3901}`));

async function listEntries(url) {
    {
            const out = [];
            const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            sorted.forEach((e, i) => {
                const history = sorted.slice(0, i).filter(o => o.player.id === e.player.id && o.mode === e.mode && (o.scoring ?? 'Time') === (e.scoring ?? 'Time'));
                const f = compact(checkTraining({ ...e, scoring: e.scoring ?? 'Time' }, history));
                if (f.length) out.push({ type: 'training', id: e.id, club: { id: 'c1', name: CLUB_NAME }, at: e.createdAt, summary: `Around the Clock training · ${e.mode} · ${e.scoring === 'Darts' ? e.darts + ' darts' : (e.timeMs / 100).toFixed(2) + ' s'}`, players: [e.player], level: levelOf(f), findings: f, review: reviews.get(e.id) ?? null });
            });
            for (const g of games.values()) {
                if (!g.hasWinner) continue;
                const type = g.startingScore ? 'x01' : g.targetScore ? 'elimination' : g.throws ? 'clock' : 'cricket';
                const check = { x01: checkX01, cricket: checkCricket, elimination: checkElimination, clock: checkClock }[type];
                const f = compact(check({ ...g, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt) }));
                const repair = type === 'x01' && levelOf(f) === 'error' ? repairX01(g) : null;
                if (f.length) out.push({ type, id: g.id, club: { id: 'c1', name: CLUB_NAME }, at: g.updatedAt, summary: type === 'x01' ? 'X01 · 501 · Straight In / Double Out' : type, players: g.players.map(id => ref(players.find(p => p.id === id))), level: levelOf(f), findings: f, review: reviews.get(g.id) ?? null, ...(repair ? { repairable: repair.possible, repairReason: repair.possible ? '' : repair.reason } : {}) });
            }
            if (url.searchParams.get('scope') === 'all') out.forEach((entry, index) => { if (index % 2) entry.club = { id: 'c2', name: 'Testclub 2', logo: '' }; });
            if (!birthRestored) {
                const f = checkBirthChange(birthChange, { minAge: 16, gameDates: [new Date(2007, 5, 1), new Date(2009, 3, 1), new Date(2012, 1, 1)] });
                out.push({ type: 'birth', id: 'b1', club: { id: 'c1', name: CLUB_NAME }, at: ago(0.5), summary: 'Date of birth changed by the player', players: [ref(players[1])], level: levelOf(f), findings: f.map(x => ({ ...x, playerId: 'p2' })), review: reviews.get('b1') ?? null });
            }
            if (process.env.FP_NEW) out.push(...fpNewItems().map(({ doc, ...item }) => item));
            const rank = { impossible: 3, error: 2, suspicious: 1 };
            out.sort((a, b) => rank[b.level] - rank[a.level]);
            return out;
    }
}
