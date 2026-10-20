/**
 * The flights of the darts on the board: their colour ('auto': the player's
 * colour in the game), shape and design. A few shapes and designs are there
 * from the start; the others are unlocked with flight points, earned by
 * playing and training (the player chooses what to unlock). Many also ask
 * for a player level, an X01 average level or both before they can be
 * bought; the legendary designs need a feat instead of points.
 * The app draws them by their id (app-ui components/flights).
 */
export const FLIGHT_COLORS = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff', '#8e4ec6', '#e93d82', '#f2f2f2', '#2b2f36'];

export const RARITIES = {
    starter: 'Starter',
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    master: 'Master',
    legendary: 'Legendary',
};

// the X01 average levels (as in the app), for what a flight asks for
const AVERAGE_LEVELS = { 40: 'Amateur', 50: 'Semi-pro', 60: 'Pro', 75: 'World class', 90: 'Elite' };
// an average only counts from this many X01 games on, as for the player levels
export const MIN_X01_GAMES = 5;

// cost: flight points; level: the player level needed (1 = Rookie); average: the X01 average needed
export const FLIGHT_SHAPES = [
    { id: 'standard', label: 'Standard', rarity: 'starter' },
    { id: 'slim', label: 'Slim', rarity: 'starter' },
    { id: 'kite', label: 'Kite', rarity: 'starter' },
    { id: 'pear', label: 'Pear', rarity: 'starter' },
    { id: 'no6', label: 'Standard No6', rarity: 'common', cost: 60 },
    { id: 'shield', label: 'Shield', rarity: 'common', cost: 60 },
    { id: 'diamond', label: 'Mini Diamond', rarity: 'common', cost: 70 },
    { id: 'delta', label: 'Delta', rarity: 'rare', cost: 120 },
    { id: 'fantail', label: 'Fantail', rarity: 'rare', cost: 140, level: 3 },
    { id: 'fin', label: 'Fin', rarity: 'rare', cost: 150, level: 3 },
    { id: 'vortex', label: 'Vortex', rarity: 'rare', cost: 140, average: 50 },
    { id: 'heart', label: 'Heart', rarity: 'epic', cost: 240 },
    { id: 'sigma', label: 'Sigma', rarity: 'epic', cost: 260, level: 4 },
    { id: 'arrowhead', label: 'Arrowhead', rarity: 'epic', cost: 260, level: 5 },
    { id: 'vwing', label: 'V-Wing', rarity: 'epic', cost: 280, average: 60 },
    { id: 'tomahawk', label: 'Tomahawk', rarity: 'master', cost: 400, level: 6, average: 60 },
    { id: 'skull', label: 'Skull', rarity: 'master', cost: 500, level: 7, average: 75 },
];

// colorable: drawn in the colour the player chose; the others have colours of their own
export const FLIGHT_DESIGNS = [
    { id: 'plain', label: 'Plain', rarity: 'starter', colorable: true },
    { id: 'twoTone', label: 'Two-tone', rarity: 'starter', colorable: true },
    { id: 'tipped', label: 'Tipped', rarity: 'starter', colorable: true },
    { id: 'striped', label: 'Striped', rarity: 'starter', colorable: true },
    { id: 'chevron', label: 'Chevron', rarity: 'common', cost: 60, colorable: true },
    { id: 'checker', label: 'Checker', rarity: 'common', cost: 60, colorable: true },
    { id: 'rays', label: 'Rays', rarity: 'common', cost: 70, colorable: true },
    { id: 'waves', label: 'Waves', rarity: 'common', cost: 70, colorable: true },
    { id: 'tartan', label: 'Tartan', rarity: 'common', cost: 80, colorable: true },
    { id: 'zebra', label: 'Zebra', rarity: 'common', cost: 90 },
    { id: 'camo', label: 'Camouflage', rarity: 'rare', cost: 130 },
    { id: 'lightning', label: 'Lightning', rarity: 'rare', cost: 140, colorable: true },
    { id: 'web', label: 'Spider web', rarity: 'rare', cost: 140, colorable: true },
    { id: 'swirl', label: 'Swirl', rarity: 'rare', cost: 140, colorable: true },
    { id: 'feathers', label: 'Feathers', rarity: 'rare', cost: 150 },
    { id: 'flames', label: 'Flames', rarity: 'rare', cost: 160 },
    { id: 'ice', label: 'Ice', rarity: 'rare', cost: 170 },
    { id: 'carbon', label: 'Carbon', rarity: 'epic', cost: 240 },
    { id: 'dartboard', label: 'Dartboard', rarity: 'epic', cost: 260, level: 4 },
    { id: 'galaxy', label: 'Galaxy', rarity: 'epic', cost: 280, level: 4 },
    { id: 'ton80', label: 'Ton 80', rarity: 'epic', cost: 280, level: 4 },
    { id: 'lava', label: 'Lava', rarity: 'epic', cost: 300, level: 5 },
    { id: 'dragonScale', label: 'Dragon scales', rarity: 'epic', cost: 320, level: 5 },
    // the player levels, each with a flight of its own
    { id: 'pint', label: 'Pint', rarity: 'master', cost: 120, level: 2 },
    { id: 'crest', label: 'Club crest', rarity: 'master', cost: 180, level: 3 },
    { id: 'racing', label: 'League stripes', rarity: 'master', cost: 240, level: 4, colorable: true },
    { id: 'heraldic', label: 'County colours', rarity: 'master', cost: 300, level: 5, colorable: true },
    { id: 'proTour', label: 'Pro Tour', rarity: 'master', cost: 380, level: 6 },
    { id: 'globe', label: 'World stage', rarity: 'master', cost: 480, level: 7 },
    { id: 'crown', label: 'Crown', rarity: 'master', cost: 600, level: 8 },
    // the average levels
    { id: 'oche', label: 'Oche', rarity: 'master', cost: 120, average: 40 },
    { id: 'ton', label: 'Ton', rarity: 'master', cost: 200, average: 50 },
    { id: 'tungsten', label: 'Tungsten', rarity: 'master', cost: 300, average: 60 },
    { id: 'neon', label: 'Neon', rarity: 'master', cost: 420, average: 75 },
    { id: 'goldLeaf', label: 'Gold leaf', rarity: 'master', cost: 600, average: 90 },
    // both
    { id: 'trophy', label: 'Trophy', rarity: 'master', cost: 450, level: 6, average: 60 },
    { id: 'laurel', label: 'Laurel', rarity: 'master', cost: 650, level: 7, average: 75 },
    // feats only
    { id: 'holo', label: 'Holographic', rarity: 'legendary', feat: 'pro' },
    { id: 'nineDarter', label: 'Nine-darter', rarity: 'legendary', feat: 'nineDarter' },
    { id: 'bigFish', label: 'Big Fish', rarity: 'legendary', feat: 'bigFish' },
];

// the barrels: profile, grip and finish are drawn by the app
export const DART_BARRELS = [
    { id: 'classic', label: 'Classic', rarity: 'starter' },
    { id: 'brass', label: 'Brass', rarity: 'starter' },
    { id: 'slim', label: 'Slim', rarity: 'common', cost: 60 },
    { id: 'copper', label: 'Copper torpedo', rarity: 'common', cost: 80 },
    { id: 'scallop', label: 'Scalloped', rarity: 'rare', cost: 140 },
    { id: 'shark', label: 'Shark fin', rarity: 'rare', cost: 150, level: 3 },
    { id: 'pixel', label: 'Pixel grip', rarity: 'rare', cost: 160, average: 50 },
    { id: 'bomb', label: 'Bomb', rarity: 'epic', cost: 260, level: 4 },
    { id: 'blueCoat', label: 'Blue coat', rarity: 'epic', cost: 280, level: 4, average: 50 },
    { id: 'pro', label: 'Pro 97%', rarity: 'master', cost: 400, level: 6, average: 60 },
    { id: 'champion', label: 'Champion', rarity: 'master', cost: 500, level: 7, average: 75 },
    { id: 'legend', label: 'Legend', rarity: 'master', cost: 650, level: 8 },
    { id: 'rainbow', label: 'Rainbow titanium', rarity: 'legendary', feat: 'tenTons' },
];

// what unlocks a legendary design or barrel
export const FEATS = {
    pro: { label: 'Reach the level Pro', met: ({ levelIndex }) => levelIndex >= 6 },
    nineDarter: { label: 'Throw a nine-darter', met: ({ counts }) => (counts.nineDarters ?? 0) > 0 },
    bigFish: { label: 'Check out 170, the Big Fish', met: ({ counts }) => (counts.bigFishes ?? 0) > 0 },
    tenTons: { label: 'Throw ten 180s', met: ({ counts }) => (counts.num180s ?? 0) >= 10 },
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

// the catalog of each kind of thing to collect
export const CATALOG = { shape: FLIGHT_SHAPES, design: FLIGHT_DESIGNS, barrel: DART_BARRELS };
const itemOf = (kind, id) => (CATALOG[kind] ?? []).find(item => item.id === id) ?? null;
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

const averageName = (average) => `${AVERAGE_LEVELS[average] ?? 'an average'} (${average})`;

/**
 * What a flight asks for besides its points, in words: "the level Pro and an
 * X01 average of Pro (60)", or null.
 */
export const requirementOf = (item, levels = []) => {
    const parts = [
        item.level && `the level ${levels[item.level - 1]?.name ?? item.level}`,
        item.average && `an X01 average of ${averageName(item.average)}`,
    ].filter(Boolean);
    return parts.length ? parts.join(' and ') : null;
};

/**
 * Where a player stands with the flights: their points (earned, spent on the
 * flights unlocked, left) and every shape and design with its state:
 * 'owned' (from the start, unlocked, or a feat met), 'available' (can be
 * unlocked now), 'expensive' (not enough points yet) or 'locked' (a level,
 * an average or a feat still missing), with why.
 * counts: as for flightPoints; levelIndex: the player level (1 = Rookie);
 * average: the X01 average (null until it counts); unlocked: the keys
 * ("shape:fantail") of what the player unlocked.
 */
export const flightStanding = ({ counts = {}, levelIndex = 1, average = null, unlocked = [], levels = [] }) => {
    const earned = flightPoints(counts);
    const owned = new Set(unlocked);
    const spent = unlocked.reduce((sum, key) => {
        const [kind, id] = key.split(':');
        return sum + (itemOf(kind, id)?.cost ?? 0);
    }, 0);
    const balance = Math.max(0, earned.total - spent);

    const stateOf = (kind, item) => {
        if (item.rarity === 'starter' || owned.has(unlockKey(kind, item.id))) return { state: 'owned' };
        if (item.feat) {
            const feat = FEATS[item.feat];
            return feat.met({ counts, levelIndex }) ? { state: 'owned' } : { state: 'locked', reason: feat.label };
        }
        const levelMissing = item.level && levelIndex < item.level;
        const averageMissing = item.average && (average == null || average < item.average);
        if (levelMissing || averageMissing) {
            const missing = requirementOf({ level: levelMissing ? item.level : null, average: averageMissing ? item.average : null }, levels);
            // in short too, for a small tile: "Pro · avg 60"
            const short = [levelMissing && (levels[item.level - 1]?.name ?? `Level ${item.level}`), averageMissing && `avg ${item.average}`].filter(Boolean).join(' · ');
            return { state: 'locked', reason: `Needs ${missing}`, short };
        }
        if (balance < item.cost) return { state: 'expensive', reason: `${item.cost - balance} more points` };
        return { state: 'available' };
    };
    const describe = (kind) => (item) => ({
        kind,
        id: item.id,
        label: item.label,
        rarity: item.rarity,
        cost: item.cost ?? null,
        requires: requirementOf(item, levels),
        colorable: Boolean(item.colorable),
        ...stateOf(kind, item),
    });

    return {
        points: { earned: earned.total, spent, balance, breakdown: earned.breakdown },
        levelIndex,
        levelName: levels[levelIndex - 1]?.name ?? null,
        average,
        shapes: FLIGHT_SHAPES.map(describe('shape')),
        designs: FLIGHT_DESIGNS.map(describe('design')),
        barrels: DART_BARRELS.map(describe('barrel')),
    };
};

const itemsOf = (standing, kind) => ({ shape: standing.shapes, design: standing.designs, barrel: standing.barrels })[kind] ?? [];

// whether a player may use a shape, design or barrel: what they own
export const mayUse = (standing, kind, id) => itemsOf(standing, kind).some(item => item.id === id && item.state === 'owned');

/**
 * Unlocking a shape, design or barrel: { ok: true, key } or { ok: false, reason }.
 */
export const unlockCheck = (standing, kind, id) => {
    const item = itemsOf(standing, kind).find(entry => entry.id === id);
    if (!item) return { ok: false, reason: 'There is no such flight.' };
    if (item.state === 'owned') return { ok: false, reason: 'You have it already.' };
    if (item.state !== 'available') return { ok: false, reason: item.reason };
    return { ok: true, key: unlockKey(kind, id) };
};
