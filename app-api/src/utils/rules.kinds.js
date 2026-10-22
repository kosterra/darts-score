/**
 * The newer games and trainings of the rules engine (the app holds the
 * rules, see app-ui/src/rules): their kinds as the API keeps them.
 */

// the games, by kind, with their name
export const RULES_GAMES = {
    shanghai: 'Shanghai',
    killer: 'Killer',
    halveit: 'Halve-It',
    golf: 'Golf',
    tactics: 'Tactics',
};

// the trainings, by kind, with their name and whether a higher score is better
export const RULES_TRAININGS = {
    bobs27: { title: 'Bob\'s 27', higherIsBetter: true },
    checkout121: { title: '121 Checkout', higherIsBetter: true },
    randomcheckouts: { title: 'Random checkouts', higherIsBetter: true },
    scoring: { title: 'Scoring', higherIsBetter: true },
    doublesaround: { title: 'Doubles around the board', higherIsBetter: false },
    catch40: { title: 'Catch 40', higherIsBetter: true },
};

export const GAME_KINDS = Object.keys(RULES_GAMES);
export const TRAINING_KINDS = Object.keys(RULES_TRAININGS);
export const isRulesGame = (type) => Object.hasOwn(RULES_GAMES, type);

// a dart as the board enters it: 'T20', 'D25', 'S5', '0'; a training of hits and misses: 'H', 'M'
export const DART = /^(0|[SDT]([1-9]|1\d|20)|[SD]25|H|M)$/;
