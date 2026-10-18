/**
 * Live figures of a running Elimination game.
 */

const SINGLE_DARTS = [
    ...Array.from({ length: 20 }, (_, i) => [i + 1, `S${i + 1}`]),
    [25, 'S25'],
    ...Array.from({ length: 20 }, (_, i) => [2 * (i + 1), `D${i + 1}`]),
    [50, 'D25'],
    ...Array.from({ length: 20 }, (_, i) => [3 * (i + 1), `T${i + 1}`]),
];

/**
 * The one dart that scores exactly "points", the simplest first (a single
 * before a double before a treble), or null.
 */
export const dartFor = (points) => SINGLE_DARTS.find(([value]) => value === points)?.[1] ?? null;

/**
 * Every player's score right now, the darts of the visit being entered
 * included: { [playerId]: score }.
 */
export const liveScores = (game, throwScore) => Object.fromEntries(game.players.map(id => [
    id,
    (game.playerModels[id]?.score ?? 0) + (id === game.currentPlayerTurn ? throwScore : 0),
]));

/**
 * The opponents the player can send back to 0 with one dart, as
 * [{ playerId, dart }]: their score is one dart away.
 */
export const knockBacks = (game, scores, playerId) => game.players
    .filter(id => id !== playerId && scores[id] > scores[playerId] && scores[id] < game.targetScore)
    .map(id => ({ playerId: id, dart: dartFor(scores[id] - scores[playerId]) }))
    .filter(entry => entry.dart);

/**
 * A player's visits with what they scored and their total after each:
 * [{ darts, roundScore, total, bust }].
 */
export const visitsOf = (game, playerId) => (game.allThrows ?? [])
    .filter(visit => visit?.playerId === playerId)
    .map(visit => ({
        darts: (visit.darts ?? []).filter(dart => dart && dart.trim() !== ''),
        roundScore: Number(visit.roundScore ?? 0),
        total: game.targetScore - Number(visit.scoreLeft ?? 0),
        bust: Boolean(visit.bust),
    }));
