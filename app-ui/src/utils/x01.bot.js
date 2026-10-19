import { checkoutRoutes, setupSuggestions, scoringTip } from './checkout.routes';

/**
 * The training bot of X01: it plays like the player it trains with. Its
 * strength is a 3-dart average and a checkout rate (doubles hit per dart at a
 * double), taken from the player's statistics. It aims like a player (the way
 * out, a setup shot, otherwise the treble) and hits or misses like one: a dart
 * at a treble lands in the treble, the single or next to it, a dart at a
 * double in the double, the single or outside the board.
 */

export const BOT_ID = 'bot';

// the numbers in their order round the board, for the darts that land next door
const BOARD = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const neighbours = (number) => {
    const index = BOARD.indexOf(number);
    return [BOARD[(index + 19) % 20], BOARD[(index + 1) % 20]];
};

// what a dart at the treble 20 scores on average when it misses (mostly the single, sometimes next door)
const MISS_ON_TREBLE = 0.75 * 20 + 0.25 * 3;
// a wild dart: anywhere on the board or off it
const WILD_DART = 5.25;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * The bot's skill for a 3-dart average and a checkout rate (0–1):
 * { treble, double, wild } – the chance to hit a treble aimed at, a double
 * aimed at, and to throw a wild dart. Worked out so that whole legs come
 * out at the average.
 */
export const botSkill = ({ average = 30, checkoutRate = null } = {}) => {
    // the average of the statistics counts every dart, the finishing ones too;
    // they cost about ten points, so the scoring darts aim a little higher
    // (measured over simulated legs, see the tests)
    const scoring = 1.04 * clamp(Number(average) || 30, 8, 115) + 9.6;
    const perDart = scoring / 3;
    let treble = (perDart - MISS_ON_TREBLE) / (60 - MISS_ON_TREBLE);
    let wild = 0;
    if (treble < 0.02) {
        // weaker than a dart that always lands near the 20: some darts go wild
        treble = 0.02;
        const controlled = treble * 60 + (1 - treble) * MISS_ON_TREBLE;
        wild = clamp((controlled - perDart) / (controlled - WILD_DART), 0, 0.9);
    }
    treble = clamp(treble, 0.02, 0.6);
    // without a checkout rate of its own: about what goes with the average
    const double = clamp(checkoutRate ?? (0.06 + treble * 0.7), 0.03, 0.6);
    return { treble, double, wild };
};

/**
 * Where the bot aims with its next dart: the first dart of the way out, a
 * setup shot, or the scoring treble; at a double to start with double in.
 */
export const botTarget = ({ score, dartsLeft = 3, outMode = 'Double Out', started = true, inMode = 'Straight In' } = {}) => {
    if (!started && inMode === 'Double In') return 'D20';
    if (!started && inMode === 'Master In') return 'T20';
    const route = checkoutRoutes(score, { dartsLeft, outMode })[0];
    if (route) return route[0];
    const setup = setupSuggestions(score, { dartsLeft, outMode })[0];
    if (setup?.darts?.length) return setup.darts[0];
    const tip = scoringTip(score, { dartsLeft, outMode });
    if (tip?.darts?.length) return tip.darts[0];
    // below a treble: whatever single brings it home or near
    if (score <= 20) return `S${score}`;
    return 'T20';
};

/**
 * Where a dart aimed at the target lands, for the skill. random: a function
 * giving numbers from 0 to 1 (Math.random, or a seeded one in the tests).
 */
export const throwAt = (target, skill, random = Math.random) => {
    if (random() < skill.wild) {
        // anywhere: half of them off the board
        return random() < 0.5 ? '0' : `S${BOARD[Math.floor(random() * 20)]}`;
    }
    const ring = target[0];
    const number = Number(target.slice(1));
    const roll = random();
    const nextDoor = () => neighbours(number)[random() < 0.5 ? 0 : 1];

    if (number === 25) {
        // the bull: the bullseye, the outer bull or a single round it
        const hit = ring === 'D' ? skill.double * 0.8 : clamp(skill.treble + 0.25, 0.25, 0.8);
        if (roll < hit) return target;
        if (roll < hit + 0.4 * (1 - hit)) return ring === 'D' ? 'S25' : 'D25';
        return `S${BOARD[Math.floor(random() * 20)]}`;
    }
    if (ring === 'T') {
        if (roll < skill.treble) return target;
        const miss = random();
        return miss < 0.75 ? `S${number}` : (random() < 0.85 ? `S${nextDoor()}` : `T${nextDoor()}`);
    }
    if (ring === 'D') {
        if (roll < skill.double) return target;
        const miss = random();
        return miss < 0.5 ? `S${number}` : (miss < 0.9 ? '0' : `D${nextDoor()}`);
    }
    // a single: wide, so mostly hit
    const single = clamp(0.7 + skill.treble, 0.7, 0.97);
    if (roll < single) return target;
    return random() < 0.3 ? `T${number}` : `S${nextDoor()}`;
};

/**
 * The bot's next dart in a visit: { target, dart }.
 */
export const botDart = ({ score, dartsLeft, outMode, inMode, started, skill, random = Math.random }) => {
    const target = botTarget({ score, dartsLeft, outMode, inMode, started });
    return { target, dart: throwAt(target, skill, random) };
};

/**
 * The bot as a player of its trainings: no player of the club, so it is
 * made up here, with what it plays like as its name.
 */
export const botPlayer = (bot = {}) => ({
    id: BOT_ID,
    nickname: 'Bot',
    // shows as "B" where a player shows their initials
    firstname: 'Bot',
    lastname: '',
    profileImg: '',
    isBot: true,
    average: bot.average ?? null,
});

// how much easier or harder than the player the bot plays
export const BOT_LEVELS = [
    { value: 'easier', label: 'Easier', factor: 0.85 },
    { value: 'same', label: 'Like you', factor: 1 },
    { value: 'harder', label: 'Harder', factor: 1.15 },
];

/**
 * How strong the bot plays against a player, from their statistics:
 * { average, checkoutRate, basis }. The average is the player's recent form
 * (the last five X01 games), else their X01 average, else what their level
 * or age suggests (fallback); the checkout rate counts from ten darts at a
 * double on. level: one of BOT_LEVELS.
 */
export const botStrengthFrom = ({ form = null, stats = null, fallback = null, level = 'same' } = {}) => {
    const factor = BOT_LEVELS.find(entry => entry.value === level)?.factor ?? 1;
    let average;
    let basis;
    if (form?.games >= 5 && form.recentAverage > 0) {
        average = form.recentAverage;
        basis = 'your last 5 X01 games';
    } else if ((stats?.playedGames?.x01 ?? 0) > 0 && stats?.avg?.overallX01 > 0) {
        average = stats.avg.overallX01;
        basis = 'your X01 games';
    } else {
        average = fallback?.average ?? 30;
        basis = fallback?.text ?? 'no X01 games yet';
    }
    const checkouts = stats?.checkouts ?? {};
    const checkoutRate = checkouts.total >= 10 ? checkouts.hit / checkouts.total : null;
    return {
        average: Math.round(average * factor * 10) / 10,
        checkoutRate: checkoutRate == null ? null : Math.min(0.9, Math.round(checkoutRate * factor * 1000) / 1000),
        basis,
    };
};
