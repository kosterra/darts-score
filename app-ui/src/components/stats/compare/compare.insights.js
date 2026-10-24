import { t } from '../../../utils/i18n';

/**
 * The comparison in words: the two or three differences that stand out among
 * the figures, as short sentences, e.g. "Anna scores 6.3 more per visit:
 * 58.2 against Ben's 51.9." A second sentence prefers a figure where someone
 * else leads, so the words show both sides.
 * rows: as for SideBySide ({ key, label, values, texts?, lowerIsBetter?,
 * neutral?, weight? }); players: [{ nickname }]
 */

// how a figure is said, by its key; the others get the general sentence
const SENTENCES = {
    average: (v) => t('{{name}} scores {{lead}} more per visit: {{best}} against {{other}}\'s {{next}}.', v),
    checkout: (v) => t('{{name}} checks out better: {{best}} against {{other}}\'s {{next}}.', v),
    checkoutRate: (v) => t('{{name}} checks out better: {{best}} against {{other}}\'s {{next}}.', v),
    won: (v) => t('{{name}} won more of these games: {{best}} against {{other}}\'s {{next}}.', v),
    wins: (v) => t('{{name}} won more of these games: {{best}} against {{other}}\'s {{next}}.', v),
    winRate: (v) => t('{{name}} wins more often: {{best}} against {{other}}\'s {{next}}.', v),
    dartsPerLeg: (v) => t('{{name}} needs fewer darts per leg: {{best}} against {{other}}\'s {{next}}.', v),
    firstNine: (v) => t('{{name}} starts the legs stronger, with a first-9 average of {{best}} against {{other}}\'s {{next}}.', v),
    num180s: (v) => t('{{name}} threw more 180s: {{best}} against {{other}}\'s {{next}}.', v),
    180: (v) => t('{{name}} threw more 180s: {{best}} against {{other}}\'s {{next}}.', v),
    rating: (v) => t('{{name}} has the higher club rating: {{best}} against {{other}}\'s {{next}}.', v),
};
const general = (v) => (v.lowerIsBetter
    ? t('{{name}} is ahead in {{figure}} with {{best}}, {{other}} has {{next}}.', v)
    : t('{{name}} leads in {{figure}}: {{best}} against {{other}}\'s {{next}}.', v));

// decimals as in the shown text
const decimalsOf = (text) => (String(text).match(/\.(\d+)/)?.[1].length ?? 0);

export const insightsOf = (rows, players, { max = 3 } = {}) => {
    const candidates = rows
        .filter(row => !row.neutral)
        .map(row => {
            const values = row.values.map(Number);
            const counted = values.map((value, index) => ({ value, index })).filter(entry => entry.value > 0 || (!row.lowerIsBetter && entry.value >= 0));
            if (counted.length < 2 || counted.every(entry => entry.value === 0)) return null;
            counted.sort((a, b) => (row.lowerIsBetter ? a.value - b.value : b.value - a.value));
            const [best, next] = counted;
            if (best.value === next.value) return null;
            const base = Math.max(Math.abs(next.value), Math.abs(best.value), 1e-9);
            const gap = Math.abs(best.value - next.value) / base;
            // small counts (4 against 2 180s) look big; the key figures carry a weight, the others count half
            return { row, best, next, score: gap * (row.weight ?? 0.5) };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

    // the strongest difference, then the strongest where someone else leads, then the next strongest
    const chosen = candidates.slice(0, 1);
    const contrast = candidates.find(candidate => chosen[0] && candidate.best.index !== chosen[0].best.index);
    if (contrast && max > 1) chosen.push(contrast);
    for (const candidate of candidates) {
        if (chosen.length >= max) break;
        if (!chosen.includes(candidate)) chosen.push(candidate);
    }

    return chosen.map(({ row, best, next }) => {
        const text = (index) => String(row.texts?.[index] ?? row.values[index]);
        const lead = Math.abs(best.value - next.value);
        const values = {
            name: players[best.index]?.nickname ?? '',
            other: players[next.index]?.nickname ?? '',
            figure: row.label,
            best: text(best.index),
            next: text(next.index),
            lead: row.formatLead ? row.formatLead(lead) : String(Number(lead.toFixed(decimalsOf(text(best.index))))),
            lowerIsBetter: row.lowerIsBetter,
        };
        return { key: row.key, text: (SENTENCES[row.key] ?? general)(values), playerIndex: best.index };
    });
};
