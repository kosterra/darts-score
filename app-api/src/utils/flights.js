/**
 * The flights of the darts on the board: their colour ('auto': the player's
 * colour in the game), shape and design. A few shapes and designs are there
 * from the start; the others are unlocked with flight points, earned by
 * playing and training (the player chooses what to unlock), the rarer ones
 * only from a player level on. The legendary designs need a feat instead.
 * The app draws them by their id (app-ui components/flights).
 */
export const FLIGHT_COLORS = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff', '#8e4ec6', '#e93d82', '#f2f2f2', '#2b2f36'];

// what a flight of each rarity costs, and from which player level (1 = Rookie) it can be unlocked
export const RARITIES = {
    starter: { label: 'Starter', cost: 0, minLevel: 1 },
    common: { label: 'Common', cost: 40, minLevel: 1 },
    rare: { label: 'Rare', cost: 100, minLevel: 3 },
    epic: { label: 'Epic', cost: 200, minLevel: 4 },
    legendary: { label: 'Legendary', cost: null, minLevel: 1 },
};

export const FLIGHT_SHAPES = [
    { id: 'standard', label: 'Standard', rarity: 'starter' },
    { id: 'slim', label: 'Slim', rarity: 'starter' },
    { id: 'kite', label: 'Kite', rarity: 'starter' },
    { id: 'pear', label: 'Pear', rarity: 'starter' },
    { id: 'no6', label: 'Standard No6', rarity: 'common' },
    { id: 'shield', label: 'Shield', rarity: 'common' },
    { id: 'fantail', label: 'Fantail', rarity: 'rare' },
    { id: 'vortex', label: 'Vortex', rarity: 'rare' },
    { id: 'delta', label: 'Delta', rarity: 'rare' },
    { id: 'arrowhead', label: 'Arrowhead', rarity: 'epic' },
    { id: 'heart', label: 'Heart', rarity: 'epic' },
];

// colorable: drawn in the colour the player chose; the others have colours of their own
export const FLIGHT_DESIGNS = [
    { id: 'plain', label: 'Plain', rarity: 'starter', colorable: true },
    { id: 'twoTone', label: 'Two-tone', rarity: 'starter', colorable: true },
    { id: 'tipped', label: 'Tipped', rarity: 'starter', colorable: true },
    { id: 'striped', label: 'Striped', rarity: 'starter', colorable: true },
    { id: 'chevron', label: 'Chevron', rarity: 'common', colorable: true },
    { id: 'checker', label: 'Checker', rarity: 'common', colorable: true },
    { id: 'rays', label: 'Rays', rarity: 'common', colorable: true },
    { id: 'waves', label: 'Waves', rarity: 'common', colorable: true },
    { id: 'lightning', label: 'Lightning', rarity: 'rare', colorable: true },
    { id: 'web', label: 'Spider web', rarity: 'rare', colorable: true },
    { id: 'swirl', label: 'Swirl', rarity: 'rare', colorable: true },
    { id: 'flames', label: 'Flames', rarity: 'rare', colorable: false },
    { id: 'dartboard', label: 'Dartboard', rarity: 'epic', colorable: false },
    { id: 'ton80', label: 'Ton 80', rarity: 'epic', colorable: false },
    { id: 'carbon', label: 'Carbon', rarity: 'epic', colorable: false },
    { id: 'holo', label: 'Holographic', rarity: 'legendary', colorable: false, feat: 'pro' },
    { id: 'nineDarter', label: 'Nine-darter', rarity: 'legendary', colorable: false, feat: 'nineDarter' },
    { id: 'bigFish', label: 'Big Fish', rarity: 'legendary', colorable: false, feat: 'bigFish' },
];

// what unlocks a legendary design
export const FEATS = {
    pro: { label: 'Reach the level Pro', met: ({ levelIndex }) => levelIndex >= 6 },
    nineDarter: { label: 'Throw a nine-darter', met: ({ counts }) => (counts.nineDarters ?? 0) > 0 },
    bigFish: { label: 'Check out 170, the Big Fish', met: ({ counts }) => (counts.bigFishes ?? 0) > 0 },
};

// how the flight points are earned: per finished game and training, and for what went well
export const POINT_RULES = [
    { id: 'games', label: 'Games finished', per: 4 },
    { id: 'wins', label: 'Games won', per: 4 },
    { id: 'trainings', label: 'Around the Clock trainings', per: 2 },
    { id: 'botTrainings', label: 'Trainings against the bot', per: 3 },
    { id: 'botWins', label: 'Trainings won against the bot', per: 3 },
    { id: 'num180s', label: '180s', per: 5 },
    { id: 'highFinishes', label: 'Checkouts of 100 or more', per: 3 },
];

const itemOf = (kind, id) => (kind === 'shape' ? FLIGHT_SHAPES : FLIGHT_DESIGNS).find(item => item.id === id) ?? null;
export const unlockKey = (kind, id) => `${kind}:${id}`;

/**
 * The flight points from what a player did: { total, breakdown: [{ id, label, per, count, points }] }.
 * counts: the replayed metrics plus botTrainings and botWins.
 */
export const flightPoints = (counts = {}) => {
    const breakdown = POINT_RULES.map(rule => {
        const count = Math.max(0, Number(counts[rule.id]) || 0);
        return { ...rule, count, points: count * rule.per };
    });
    return { total: breakdown.reduce((sum, entry) => sum + entry.points, 0), breakdown };
};

/**
 * Where a player stands with the flights: their points (earned, spent on the
 * flights unlocked, left) and every shape and design with its state:
 * 'owned' (from the start, unlocked, or a feat met), 'available' (can be
 * unlocked now), 'expensive' (not enough points yet) or 'locked' (a level or
 * a feat still missing), with why.
 * counts: as for flightPoints, levelIndex: the player level (1 = Rookie),
 * unlocked: the keys ("shape:fantail") of what the player unlocked.
 */
export const flightStanding = ({ counts = {}, levelIndex = 1, unlocked = [], levels = [] }) => {
    const earned = flightPoints(counts);
    const owned = new Set(unlocked);
    const spent = unlocked.reduce((sum, key) => {
        const [kind, id] = key.split(':');
        return sum + (RARITIES[itemOf(kind, id)?.rarity]?.cost ?? 0);
    }, 0);
    const balance = Math.max(0, earned.total - spent);
    const levelName = (index) => levels[index - 1]?.name ?? `level ${index}`;

    const stateOf = (kind, item) => {
        const rarity = RARITIES[item.rarity];
        if (item.rarity === 'starter' || owned.has(unlockKey(kind, item.id))) return { state: 'owned' };
        if (item.feat) {
            const feat = FEATS[item.feat];
            return feat.met({ counts, levelIndex }) ? { state: 'owned' } : { state: 'locked', reason: feat.label };
        }
        if (levelIndex < rarity.minLevel) return { state: 'locked', reason: `From the level ${levelName(rarity.minLevel)}` };
        if (balance < rarity.cost) return { state: 'expensive', reason: `${rarity.cost - balance} more points` };
        return { state: 'available' };
    };
    const describe = (kind) => (item) => ({ kind, id: item.id, label: item.label, rarity: item.rarity, cost: RARITIES[item.rarity].cost, colorable: item.colorable, ...stateOf(kind, item) });

    return {
        points: { earned: earned.total, spent, balance, breakdown: earned.breakdown },
        levelIndex,
        shapes: FLIGHT_SHAPES.map(describe('shape')),
        designs: FLIGHT_DESIGNS.map(describe('design')),
    };
};

// whether a player may fly a shape or design: what they own
export const mayUse = (standing, kind, id) =>
    (kind === 'shape' ? standing.shapes : standing.designs).some(item => item.id === id && item.state === 'owned');

/**
 * Unlocking a shape or design: { ok: true, key } or { ok: false, reason }.
 */
export const unlockCheck = (standing, kind, id) => {
    const item = (kind === 'shape' ? standing.shapes : standing.designs).find(entry => entry.id === id);
    if (!item) return { ok: false, reason: 'There is no such flight.' };
    if (item.state === 'owned') return { ok: false, reason: 'You have it already.' };
    if (item.state !== 'available') return { ok: false, reason: item.reason };
    return { ok: true, key: unlockKey(kind, id) };
};
