const RING_NAMES = { S: 'Single', D: 'Double', T: 'Treble' };

/**
 * Every hit field of a player, most hit first, with its share of all darts
 * on the board: [{ key, name, short, count, share }] — e.g. { short: 'T20',
 * name: 'Treble 20' }; the bull is "Bull" (double) and "Outer bull" (single).
 * hits: [{ section: '20', S, D, T }]
 */
export const hitFields = (hits = []) => {
    const fields = hits.flatMap(entry => ['S', 'D', 'T'].map(ring => {
        const section = Number(entry.section);
        const count = Number(entry[ring] ?? 0);
        if (section === 25 && ring === 'T') return null;
        const bull = section === 25;
        return {
            key: `${ring}${section}`,
            short: bull ? (ring === 'D' ? 'Bull' : 'Outer bull') : `${ring}${section}`,
            name: bull ? (ring === 'D' ? 'Bull' : 'Outer bull') : `${RING_NAMES[ring]} ${section}`,
            count,
        };
    })).filter(field => field && field.count > 0);
    const total = fields.reduce((sum, field) => sum + field.count, 0);
    return fields
        .map(field => ({ ...field, share: total ? field.count / total : 0 }))
        .sort((a, b) => b.count - a.count);
};

/**
 * A share as text: "12 %", below one percent "0.4 %".
 */
export const formatShare = (share) => {
    const percent = share * 100;
    return `${percent >= 1 || percent === 0 ? Math.round(percent) : percent.toFixed(1)} %`;
};
