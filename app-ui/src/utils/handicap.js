import { averageLevelOf } from './average.levels';

// A fair X01 handicap for players of different strength: the strongest plays
// by the game's settings, the others start lower and may have easier in/out
// rules. The strength is the recent 3-dart average, else what the player
// level stands for, else what is usual for the age.

export const X01_STARTING_SCORES = [101, 170, 201, 301, 401, 501, 601, 701, 801, 901, 1001];

// a rough 3-dart average for each player level (the levels count experience as well)
const LEVEL_AVERAGES = {
    rookie: 20, pubPlayer: 28, clubRegular: 36, leaguePlayer: 44,
    countyPlayer: 54, pro: 65, worldClass: 80, legend: 95,
};

// what a player of that age without any X01 games averages, roughly
const averageForAge = (age) => {
    if (age == null) return 30;
    if (age < 8) return 10;
    if (age < 11) return 15;
    if (age < 14) return 22;
    if (age < 70) return 30;
    return 26;
};

// children (and rather weak players) are spared the double to finish
const CHILD_AGE = 12;
const WEAK_AVERAGE = 30;
// how much weaker before the in or out mode gets easier
const EASIER_OUT_RATIO = 0.6;
const EASIER_IN_RATIO = 0.8;
// how much weaker before the strongest also has to start on a double
const HARDER_IN_RATIO = 0.5;

export const ageOn = (dateOfBirth, today = new Date()) => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const beforeBirthday = today.getMonth() < birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (beforeBirthday) age -= 1;
    return age;
};

/**
 * How strong a player is, with where that comes from.
 * info: { age, recentAverage, games, levelId }
 */
export const strengthOf = ({ age = null, recentAverage = null, games = 0, levelId = null } = {}) => {
    if (recentAverage != null && games > 0) {
        return { average: recentAverage, source: 'average', text: `${averageLevelOf(recentAverage)?.name ?? 'Beginner'}, average ${recentAverage.toFixed(1)}` };
    }
    if (levelId && LEVEL_AVERAGES[levelId] != null && levelId !== 'rookie') {
        return { average: LEVEL_AVERAGES[levelId], source: 'level', text: 'no X01 average yet, from the level' };
    }
    return { average: averageForAge(age), source: 'age', text: 'no X01 games yet' };
};

// the allowed starting score closest to the wish, never above the game's
const nearestScore = (wish, max) => X01_STARTING_SCORES
    .filter(score => score <= max)
    .reduce((best, score) => Math.abs(score - wish) < Math.abs(best - wish) ? score : best, X01_STARTING_SCORES[0]);

const SHORT_OUT = { 'Straight Out': 'Straight Out', 'Double Out': 'Double Out', 'Master Out': 'Master Out' };

/**
 * The suggestion for every player: { [playerId]: { startingScore, legInMode,
 * legOutMode, reason } }.
 *
 * game: { startingScore, legInMode, legOutMode } the settings of the game
 * players: [{ id, age, recentAverage, games, levelId }]
 */
export const suggestHandicap = (game, players) => {
    const base = Number(game.startingScore);
    const strengths = players.map(player => ({ player, strength: strengthOf(player) }));
    const strongest = Math.max(...strengths.map(({ strength }) => strength.average), 1);
    const weakestRatio = Math.min(...strengths.map(({ strength }) => strength.average / strongest));

    return Object.fromEntries(strengths.map(({ player, strength }) => {
        const ratio = strength.average / strongest;
        const isStrongest = ratio >= 0.999;
        const isChild = player.age != null && player.age < CHILD_AGE;

        const startingScore = isStrongest ? base : nearestScore(base * ratio, base);

        let legOutMode = game.legOutMode;
        if (game.legOutMode !== 'Straight Out' && !isStrongest
            && (ratio < EASIER_OUT_RATIO || strength.average < WEAK_AVERAGE || isChild)) {
            legOutMode = 'Straight Out';
        }

        let legInMode = game.legInMode;
        if (game.legInMode !== 'Straight In' && !isStrongest && ratio < EASIER_IN_RATIO) legInMode = 'Straight In';
        // a much stronger player also has to open with a double
        if (isStrongest && game.legInMode === 'Straight In' && weakestRatio < HARDER_IN_RATIO) legInMode = 'Double In';

        const why = [player.age != null ? `${player.age} years` : null, strength.text].filter(Boolean).join(' · ');
        const rules = `${startingScore} ${legInMode === 'Straight In' ? '' : legInMode + ' '}${SHORT_OUT[legOutMode]}`.replace(/\s+/g, ' ');
        const reason = isStrongest && players.length > 1
            ? `${why} → strongest: ${rules}`
            : `${why} → ${rules}`;

        return [player.id, { startingScore, legInMode, legOutMode, reason }];
    }));
};
