import { TARGETS } from '../../utils/atc.darts';

// the numbers clockwise from the top, as on a real board
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const C = 50;
// ring radii: bullseye, outer bull, inner single, treble, outer single, double
const R = { bull: 3.6, outer: 8, treble: [26, 30], double: [40, 44] };

const point = (radius, degrees) => {
    const angle = (degrees - 90) * Math.PI / 180;
    return `${(C + radius * Math.cos(angle)).toFixed(2)} ${(C + radius * Math.sin(angle)).toFixed(2)}`;
};
// one ring of one number's segment
const segment = (inner, outer, start, end) =>
    `M${point(inner, start)} L${point(outer, start)} A${outer} ${outer} 0 0 1 ${point(outer, end)} L${point(inner, end)} A${inner} ${inner} 0 0 0 ${point(inner, start)} Z`;

/**
 * A small dartboard with the target of the player at the oche lit up, in the
 * ring the mode asks for: the double, the treble, the singles or the whole
 * number; the bull at the end.
 */
const ATCTargetBoard = ({ target, mode }) => {
    const bull = target >= TARGETS - 1;
    const number = bull ? null : target + 1;
    const lit = (ring) => {
        if (bull) return false;
        if (mode === 'Double') return ring === 'double';
        if (mode === 'Triple') return ring === 'treble';
        if (mode === 'Single') return ring === 'single';
        return true;
    };

    return (
        <svg viewBox="0 0 100 100" className="atc-target-board" aria-hidden="true">
            <circle cx={C} cy={C} r="49" fill="#1b1a18" />
            {ORDER.map((n, index) => {
                const start = index * 18 - 9;
                const end = start + 18;
                const dark = index % 2 === 0;
                const mine = n === number;
                const fill = (ring, base) => mine && lit(ring) ? 'is-lit' : base;
                return (
                    <g key={n}>
                        <path d={segment(R.outer, R.treble[0], start, end)} className={fill('single', dark ? 'is-dark' : 'is-light')} />
                        <path d={segment(R.treble[0], R.treble[1], start, end)} className={fill('treble', dark ? 'is-red' : 'is-green')} />
                        <path d={segment(R.treble[1], R.double[0], start, end)} className={fill('single', dark ? 'is-dark' : 'is-light')} />
                        <path d={segment(R.double[0], R.double[1], start, end)} className={fill('double', dark ? 'is-red' : 'is-green')} />
                        <text
                            x={point(47, start + 9).split(' ')[0]}
                            y={Number(point(47, start + 9).split(' ')[1]) + 1.6}
                            textAnchor="middle"
                            fontSize="4.2"
                            fontWeight="700"
                            className={mine ? 'is-lit-number' : 'is-number'}
                        >{n}</text>
                    </g>
                );
            })}
            <circle cx={C} cy={C} r={R.outer} className={bull && mode !== 'Double' && mode !== 'Triple' ? 'is-lit' : 'is-green'} />
            <circle cx={C} cy={C} r={R.bull} className={bull && mode !== 'Single' ? 'is-lit' : 'is-red'} />
        </svg>
    );
};

export default ATCTargetBoard;
