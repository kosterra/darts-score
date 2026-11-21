import { parseDart } from '../rules/darts';
import { boardKeyOf } from '../rules/trainings';

// the darts of the first visit decide nothing yet: until then the curve stays green
const SETTLED = 3;
// the usual rate: of the player's latest attempts with the same settings
const RECENT = 10;

// the share of hits of darts as stored ('T20', 'H', …) after every dart, in percent (one decimal)
const ratesOf = (definition, darts, settings) => {
    let hits = 0;
    return darts.map((value, index) => {
        const dart = definition.input === 'hitmiss' ? (value === 'H' ? 'H' : 'M') : parseDart(value);
        if (definition.hit(dart, { settings })) hits += 1;
        return Math.round(hits / (index + 1) * 1000) / 10;
    });
};

/**
 * The hit rate of a training after every dart (definition.hit), for the curve: [{ score, risk }],
 * score the share of hits so far in percent. Against the player's usual rate (null: none yet) a
 * stretch at or above it is green (safe), below it amber (warn); without one, and in the first
 * visit, all green.
 */
export const hitRatePoints = (definition, darts, settings, usual = null) => ratesOf(definition, darts, settings)
    .map((score, index) => ({ score, risk: usual == null || index < SETTLED - 1 || score >= usual ? 'safe' : 'warn' }));

/**
 * A player's usual hit rate in a training: the average of the rates their latest attempts with
 * the same settings ended at (saved attempts, as the scoreboard loads them), or null without one.
 */
export const usualHitRate = (definition, entries, playerId, settings) => {
    const key = boardKeyOf(definition, settings);
    const rates = (entries ?? [])
        .filter(entry => entry.player?.id === playerId && entry.darts?.length && boardKeyOf(definition, entry.settings) === key)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, RECENT)
        .map(entry => ratesOf(definition, entry.darts, entry.settings ?? settings).at(-1));
    return rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length * 10) / 10 : null;
};
