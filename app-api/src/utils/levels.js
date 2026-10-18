import { cricketKpis } from './kpi.data.js';

// Player levels: experience points (XP) for playing, winning, badges and skill,
// and from League Player on a minimum X01 average, so a level stands for how
// someone plays and not only for how much. Worked out from the current
// statistics every time, so it always reflects the player's form.

export const LEVELS = [
    { id: 'rookie', name: 'Rookie', xp: 0 },
    { id: 'pubPlayer', name: 'Pub Player', xp: 150 },
    { id: 'clubRegular', name: 'Club Regular', xp: 400, minGames: 10 },
    { id: 'leaguePlayer', name: 'League Player', xp: 800, minAverage: 40 },
    { id: 'countyPlayer', name: 'County Player', xp: 1300, minAverage: 50 },
    { id: 'pro', name: 'Pro', xp: 2000, minAverage: 60 },
    { id: 'worldClass', name: 'World Class', xp: 3000, minAverage: 75 },
    { id: 'legend', name: 'Legend', xp: 4500, minAverage: 90, minGames: 100 },
];

export const XP_RULES = {
    perGame: 10,
    perWin: 5,
    perBadge: 20,
    per180: 5,
    perAveragePoint: 5,
    perCheckoutPercent: 2,
    perMarkPerRound: 50,
    // skill only counts once it is more than a lucky game
    minX01Games: 5,
    minCricketGames: 3,
};

const sum = (values) => values.reduce((total, value) => total + value, 0);

/**
 * The X01 average as the profile shows it: the mean of each game's average
 * at the start and in the middle of the legs.
 */
export const x01OverallAverage = (x01Games, playerId) => {
    if (!x01Games.length) return 0;
    const averages = x01Games
        .map(game => game.playerModels?.[playerId]?.averages?.game?.begMidGame ?? 0)
        .filter(average => average > 0)
        .map(average => Math.round(average));
    return Math.round(sum(averages) / x01Games.length);
};

/**
 * What a level is worked out from, out of the player's finished games and badges.
 */
export const levelInputs = ({ x01Games = [], cricketGames = [], eliminationGames = [], clockGames = [], playerId, badgeCount = 0 }) => {
    const all = [...x01Games, ...cricketGames, ...eliminationGames, ...clockGames];
    const checkouts = x01Games.map(game => game.playerModels?.[playerId]?.checkout?.game ?? {});
    return {
        games: all.length,
        wins: all.filter(game => game.playerModels?.[playerId]?.hasWonGame === true).length,
        badges: badgeCount,
        x01Games: x01Games.length,
        x01Average: x01OverallAverage(x01Games, playerId),
        checkoutHit: sum(checkouts.map(checkout => checkout.hit ?? 0)),
        checkoutTotal: sum(checkouts.map(checkout => checkout.total ?? 0)),
        num180s: sum(x01Games.map(game => game.playerModels?.[playerId]?.scoreRanges?.game?.['180'] ?? 0)),
        cricketGames: cricketGames.length,
        marksPerRound: cricketKpis(cricketGames, playerId).marksPerRound ?? 0,
    };
};

const meets = (level, inputs) =>
    (!level.minAverage || inputs.x01Average >= level.minAverage) && (!level.minGames || inputs.games >= level.minGames);

/**
 * A player's level: XP with what it is made of, the level reached, and what
 * is still missing for the next one.
 */
export const playerLevel = (inputs) => {
    const skillCounts = inputs.x01Games >= XP_RULES.minX01Games;
    const checkoutRate = inputs.checkoutTotal ? inputs.checkoutHit / inputs.checkoutTotal * 100 : 0;
    const breakdown = [
        { id: 'games', label: 'Games played', value: inputs.games, xp: inputs.games * XP_RULES.perGame },
        { id: 'wins', label: 'Wins', value: inputs.wins, xp: inputs.wins * XP_RULES.perWin },
        { id: 'badges', label: 'Badges', value: inputs.badges, xp: inputs.badges * XP_RULES.perBadge },
        { id: '180s', label: '180s', value: inputs.num180s ?? 0, xp: (inputs.num180s ?? 0) * XP_RULES.per180 },
        { id: 'average', label: 'X01 average', value: inputs.x01Average, xp: skillCounts ? Math.round(inputs.x01Average * XP_RULES.perAveragePoint) : 0, counts: skillCounts },
        { id: 'checkout', label: 'Checkout rate', value: Math.round(checkoutRate), xp: skillCounts ? Math.round(checkoutRate * XP_RULES.perCheckoutPercent) : 0, counts: skillCounts },
        {
            id: 'marksPerRound',
            label: 'Cricket marks per round',
            value: inputs.marksPerRound,
            xp: inputs.cricketGames >= XP_RULES.minCricketGames ? Math.round(inputs.marksPerRound * XP_RULES.perMarkPerRound) : 0,
            counts: inputs.cricketGames >= XP_RULES.minCricketGames,
        },
    ];
    const xp = sum(breakdown.map(entry => entry.xp));

    let index = 0;
    LEVELS.forEach((level, levelIndex) => {
        if (xp >= level.xp && meets(level, inputs) && levelIndex === index + 1) index = levelIndex;
    });

    const next = LEVELS[index + 1] ?? null;
    const missing = [];
    if (next) {
        if (xp < next.xp) missing.push({ id: 'xp', label: `${next.xp - xp} more XP` });
        if (next.minAverage && inputs.x01Average < next.minAverage) missing.push({ id: 'average', label: `an X01 average of ${next.minAverage}` });
        if (next.minGames && inputs.games < next.minGames) missing.push({ id: 'games', label: `${next.minGames} games played` });
    }

    return {
        xp,
        level: { index: index + 1, of: LEVELS.length, ...LEVELS[index] },
        next: next ? { index: index + 2, ...next, missing } : null,
        // how far it is from this level's XP to the next one's, 0–100
        progress: next ? Math.max(0, Math.min(100, Math.round((xp - LEVELS[index].xp) / (next.xp - LEVELS[index].xp) * 100))) : 100,
        breakdown,
        // the rules, so the app can explain them without a copy of its own
        ladder: LEVELS,
        rules: XP_RULES,
    };
};
