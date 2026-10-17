// Sections clockwise from the top, as on a real board
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Radii relative to the outer edge of the double ring (170 mm on a real board)
const R = { doubleOuter: 100, doubleInner: 95.3, trebleOuter: 62.9, trebleInner: 58.2, outerBull: 9.4, bull: 3.7, numbers: 110 };

const polar = (radius, angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    return [radius * Math.cos(rad), radius * Math.sin(rad)];
};

const ringSegment = (inner, outer, start, end) => {
    const [x1, y1] = polar(outer, start);
    const [x2, y2] = polar(outer, end);
    const [x3, y3] = polar(inner, end);
    const [x4, y4] = polar(inner, start);
    return `M${x1},${y1} A${outer},${outer} 0 0 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 0 0 ${x4},${y4} Z`;
};

/**
 * A dartboard whose fields are shaded by a value: the more, the stronger the
 * colour. "valueOf(section, ring)" gives the value of a field (ring is S, D or
 * T; the bull is section 25), "describe" the tooltip text.
 */
const DartboardHeatmap = ({ valueOf, describe, color = '#5fa883', onlyDoubles = false, label }) => {
    const fields = [];
    ORDER.forEach((section, index) => {
        const start = index * 18 - 9;
        const end = start + 18;
        const rings = onlyDoubles
            ? [['D', R.doubleInner, R.doubleOuter]]
            : [['D', R.doubleInner, R.doubleOuter], ['S', R.trebleOuter, R.doubleInner], ['T', R.trebleInner, R.trebleOuter], ['S', R.outerBull, R.trebleInner]];
        rings.forEach(([ring, inner, outer], ringIndex) =>
            fields.push({ key: `${section}-${ringIndex}`, section, ring, path: ringSegment(inner, outer, start, end) }));
    });

    const values = fields.map(field => valueOf(field.section, field.ring) ?? 0);
    const bullValues = [valueOf(25, 'S') ?? 0, valueOf(25, 'D') ?? 0];
    const max = Math.max(1, ...values, ...bullValues);
    // half the square root of the hits, half the rank among the hit fields: one
    // very busy field (usually the 20) does not wash out all others, and fields
    // hit a little more or less than each other still look different
    const hitValues = [...values, ...bullValues].filter(value => value > 0).sort((a, b) => a - b);
    const rankOf = (value) => hitValues.length > 1 ? hitValues.lastIndexOf(value) / (hitValues.length - 1) : 1;
    const opacity = (value) => value > 0 ? 0.1 + 0.9 * (0.5 * Math.sqrt(value / max) + 0.5 * rankOf(value)) : 0;

    return (
        <svg viewBox="-118 -118 236 236" className="dartboard-heatmap" role="img" aria-label={label}>
            <circle r={R.doubleOuter + 0.5} fill="#1b1b1b" />
            {fields.map(field => (
                <path key={field.key} d={field.path} fill="#262626" stroke="#3a3a3a" strokeWidth="0.5">
                    <title>{describe(field.section, field.ring)}</title>
                </path>
            ))}
            {fields.map((field, index) => values[index] > 0 && (
                <path key={`h-${field.key}`} d={field.path} fill={color} fillOpacity={opacity(values[index])} pointerEvents="none" />
            ))}
            {(onlyDoubles ? [['D', R.bull]] : [['S', R.outerBull], ['D', R.bull]]).map(([ring, radius]) => {
                const value = ring === 'S' ? bullValues[0] : bullValues[1];
                return (
                    <g key={ring}>
                        <circle r={radius} fill="#262626" stroke="#3a3a3a" strokeWidth="0.5">
                            <title>{describe(25, ring)}</title>
                        </circle>
                        {value > 0 && <circle r={radius} fill={color} fillOpacity={opacity(value)} pointerEvents="none" />}
                    </g>
                );
            })}
            {ORDER.map((section, index) => {
                const [x, y] = polar(R.numbers, index * 18);
                return <text key={section} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#9a9a9a">{section}</text>;
            })}
        </svg>
    );
};

export default DartboardHeatmap;
