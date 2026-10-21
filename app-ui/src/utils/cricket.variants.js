
import { t } from './i18n';// The Cricket variants:
// - Standard: marks beyond three score the number for yourself while an
//   opponent has it open; with all numbers closed the highest score wins.
// - Cut-throat: those points go to every opponent who still has the number
//   open; with all numbers closed the lowest score (or a tie) wins.
// - No-score: only closing counts; who closes everything first wins.

export const CRICKET_VARIANTS = [
    { value: t('Standard'), description: t('Extra marks score for you; highest score wins.') },
    { value: t('Cut-throat'), description: t('Extra marks score for opponents still open; lowest score wins.') },
    { value: t('No-score'), description: t('Only closing counts; first to close all wins.') },
];

export const DEFAULT_VARIANT = 'Standard';

export const CRICKET_NUMBERS = ['15', '16', '17', '18', '19', '20', '25'];

export const variantOf = (game) => game?.variant ?? DEFAULT_VARIANT;

/**
 * Cut-throat: the points each opponent gets from a visit, from the marks
 * beyond three that the visit added (marks only count beyond three while
 * some opponent has the number open).
 * before, after: the thrower's marks per number before and after the visit
 */
export const cutThroatPoints = (game, playerId, before = {}, after = {}) => {
    const opponents = game.players.filter(id => id !== playerId);
    const points = Object.fromEntries(opponents.map(id => [id, 0]));
    for (const number of CRICKET_NUMBERS) {
        const extra = Math.max(0, (after[number] ?? 0) - Math.max(before[number] ?? 0, 3));
        if (!extra) continue;
        for (const id of opponents) {
            if ((game.playerModels[id]?.sectionHit?.[number] ?? 0) < 3) points[id] += extra * Number(number);
        }
    }
    return points;
};

/**
 * Whether a player who has closed every number wins with this score against
 * the others' scores.
 */
export const winsWithScore = (variant, score, otherScores) => {
    if (variant === 'No-score') return true;
    if (variant === 'Cut-throat') return otherScores.every(other => score <= other);
    // a tie is enough: once everything is closed nobody could score any more
    return otherScores.every(other => score >= other);
};
