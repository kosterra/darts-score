import { secondColorOf } from '../../utils/flights';

/**
 * The flights as drawings, by the ids of the API (app-api utils/flights.js).
 * A flight is drawn flat in its own space: x from where it sits on the shaft
 * (0) to its back (100), y across it (-40 to 40, the fold along y = 0). The
 * gallery shows it upright, the board from behind and the turning dart one
 * half at a time.
 */

// the outlines, symmetric about the fold
const FLIGHT_SHAPES = {
    standard: 'M 0,0 L 44,-38 L 92,-40 L 100,-30 L 100,30 L 92,40 L 44,38 Z',
    slim: 'M 0,0 L 42,-22 L 100,-22 L 100,22 L 42,22 Z',
    kite: 'M 0,0 L 62,-40 Q 88,-30 100,0 Q 88,30 62,40 Z',
    pear: 'M 0,0 C 30,-24 55,-40 80,-38 C 100,-34 100,34 80,38 C 55,40 30,24 0,0 Z',
    no6: 'M 0,0 L 30,-40 L 88,-40 Q 100,-40 100,-26 L 100,26 Q 100,40 88,40 L 30,40 Z',
    shield: 'M 0,0 L 28,-34 L 100,-34 Q 88,0 100,34 L 28,34 Z',
    fantail: 'M 0,0 L 58,-32 L 96,-40 Q 106,0 96,40 L 58,32 Z',
    vortex: 'M 0,0 C 25,-30 62,-42 98,-32 L 84,0 L 98,32 C 62,42 25,30 0,0 Z',
    delta: 'M 0,0 L 72,-40 L 100,-40 L 100,40 L 72,40 Z',
    arrowhead: 'M 0,0 L 100,-36 L 74,0 L 100,36 Z',
    heart: 'M 0,0 C 30,-24 72,-44 94,-30 C 104,-20 96,-4 84,0 C 96,4 104,20 94,30 C 72,44 30,24 0,0 Z',
};

const AREA = { x: -10, y: -50, width: 125, height: 100 };
const fill = (color) => <rect {...AREA} fill={color} />;
const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);
const polar = (cx, cy, r, degrees) => [cx + r * Math.cos((degrees * Math.PI) / 180), cy + r * Math.sin((degrees * Math.PI) / 180)];
const wedge = (cx, cy, r, from, to) => {
    const [x1, y1] = polar(cx, cy, r, from);
    const [x2, y2] = polar(cx, cy, r, to);
    return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0 1 ${x2},${y2} Z`;
};
const star = (cx, cy, r) => range(0, 9, 1).map(index => polar(cx, cy, index % 2 ? r * 0.45 : r, index * 36 - 90).join(',')).join(' ');

// each design: what it paints over the whole flight, cut to the shape afterwards
const FLIGHT_DESIGNS = {
    plain: ({ color }) => fill(color),
    twoTone: ({ color, second }) => <>{fill(color)}<rect x={AREA.x} y="0" width={AREA.width} height="50" fill={second} /></>,
    tipped: ({ color, second }) => <>{fill(color)}<rect x="74" y={AREA.y} width="40" height={AREA.height} fill={second} /></>,
    striped: ({ color, second }) => <>{fill(color)}<polygon points="40,-50 52,-50 58,50 46,50" fill={second} /></>,
    chevron: ({ color, second }) => (
        <>
            {fill(color)}
            {[18, 44, 70].map(x => <polyline key={x} points={`${x + 18},-48 ${x},0 ${x + 18},48`} fill="none" stroke={second} strokeWidth="7" />)}
        </>
    ),
    checker: ({ color, second }) => (
        <>
            {fill(color)}
            {range(0, 100, 10).flatMap(x => range(-40, 30, 10).map(y => ((x + y) / 10) % 2 === 0
                ? <rect key={`${x},${y}`} x={x} y={y} width="10" height="10" fill={second} />
                : null))}
        </>
    ),
    rays: ({ color, second }) => (
        <>
            {fill(color)}
            {range(0, 5, 1).filter(index => index % 2 === 0).map(index => (
                <polygon key={index} points={`-4,0 115,${-110 + index * 36.7} 115,${-110 + (index + 1) * 36.7}`} fill={second} />
            ))}
        </>
    ),
    waves: ({ color, second }) => (
        <>
            {fill(color)}
            {[30, 55, 80].map(x => <path key={x} d={`M ${x},-48 C ${x + 14},-24 ${x - 14},0 ${x},0 S ${x + 14},24 ${x},48`} fill="none" stroke={second} strokeWidth="6" />)}
        </>
    ),
    lightning: ({ color }) => (
        <>
            {fill('#15181c')}
            <polygon points="4,0 52,-18 45,-4 100,-26 56,12 63,1" fill={color} />
        </>
    ),
    web: ({ color }) => (
        <>
            {fill('#121417')}
            {range(0, 7, 1).map(index => {
                const [x, y] = polar(54, 0, 70, index * 45);
                return <line key={index} x1="54" y1="0" x2={x} y2={y} stroke="#d9dee3" strokeWidth="1.4" />;
            })}
            {[11, 22, 33, 44].map(r => (
                <polygon key={r} points={range(0, 7, 1).map(index => polar(54, 0, r, index * 45).join(',')).join(' ')} fill="none" stroke="#d9dee3" strokeWidth="1.2" />
            ))}
            <circle cx="54" cy="0" r="5" fill={color} />
        </>
    ),
    swirl: ({ color }) => (
        <>
            {fill('#141518')}
            <path d="M 56,0 m -4,0 a 4,4 0 1,1 8,0 a 8,8 0 1,1 -16,0 a 12,12 0 1,1 24,0 a 16,16 0 1,1 -32,0 a 20,20 0 1,1 40,0 a 24,24 0 1,1 -48,0 a 28,28 0 1,1 56,0" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </>
    ),
    flames: () => (
        <>
            {fill('#121212')}
            <path d="M -4,0 C 30,-30 40,-44 82,-30 C 64,-26 60,-14 74,-10 C 56,-8 58,-2 92,0 C 58,2 56,8 74,10 C 60,14 64,26 82,30 C 40,44 30,30 -4,0 Z" fill="#e5484d" />
            <path d="M -4,0 C 26,-18 36,-28 66,-20 C 52,-16 50,-8 62,-5 C 50,-3 52,0 76,0 C 52,0 50,3 62,5 C 50,8 52,16 66,20 C 36,28 26,18 -4,0 Z" fill="#f76b15" />
            <path d="M -4,0 C 20,-9 30,-14 50,-10 C 40,-6 42,-2 58,0 C 42,2 40,6 50,10 C 30,14 20,9 -4,0 Z" fill="#ffc53d" />
        </>
    ),
    dartboard: () => (
        <>
            {fill('#121212')}
            {range(0, 19, 1).map(index => <path key={`d${index}`} d={wedge(58, 0, 34, index * 18 - 9, index * 18 + 9)} fill={index % 2 ? '#2f8f5b' : '#d64541'} />)}
            {range(0, 19, 1).map(index => <path key={`s${index}`} d={wedge(58, 0, 30, index * 18 - 9, index * 18 + 9)} fill={index % 2 ? '#f1e3c8' : '#1b1b1b'} />)}
            {range(0, 19, 1).map(index => <path key={`t${index}`} d={wedge(58, 0, 18, index * 18 - 9, index * 18 + 9)} fill={index % 2 ? '#2f8f5b' : '#d64541'} />)}
            {range(0, 19, 1).map(index => <path key={`i${index}`} d={wedge(58, 0, 15, index * 18 - 9, index * 18 + 9)} fill={index % 2 ? '#f1e3c8' : '#1b1b1b'} />)}
            <circle cx="58" cy="0" r="5" fill="#2f8f5b" />
            <circle cx="58" cy="0" r="2.4" fill="#d64541" />
        </>
    ),
    ton80: () => (
        <>
            {fill('#1b1b1b')}
            {range(0, 11, 1).map(index => <path key={index} d={wedge(58, 0, 80, index * 30 - 6, index * 30 + 6)} fill="#ffc53d" opacity="0.28" />)}
            <text x="58" y="0" transform="rotate(90 58 0)" textAnchor="middle" dominantBaseline="central" fontSize="26" fontWeight="900" fill="#ffc53d">180</text>
        </>
    ),
    carbon: () => (
        <>
            {fill('#1c1e21')}
            {range(0, 104, 8).flatMap(x => range(-48, 40, 8).map(y => ((x + y) / 8) % 2 === 0
                ? <rect key={`${x},${y}`} x={x} y={y} width="8" height="4" fill="#30343a" />
                : <rect key={`${x},${y}`} x={x} y={y} width="4" height="8" fill="#2a2d32" />))}
        </>
    ),
    holo: ({ uid }) => (
        <>
            <defs>
                <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="1" y2="1">
                    {['#ff5f6d', '#ffc371', '#f9f871', '#5ef2a5', '#4fc3f7', '#a78bfa', '#ff5f6d'].map((color, index) => <stop key={index} offset={index / 6} stopColor={color} />)}
                </linearGradient>
            </defs>
            <g className="flight-holo"><rect {...AREA} fill={`url(#${uid}-holo)`} /></g>
            {[10, 40, 70].map(x => <polygon key={x} points={`${x},-50 ${x + 8},-50 ${x + 28},50 ${x + 20},50`} fill="#ffffff" opacity="0.25" />)}
        </>
    ),
    nineDarter: ({ uid }) => (
        <>
            <defs>
                <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe28a" />
                    <stop offset="0.5" stopColor="#e9ac2f" />
                    <stop offset="1" stopColor="#9a6a12" />
                </linearGradient>
            </defs>
            <rect {...AREA} fill={`url(#${uid}-gold)`} />
            {[38, 58, 78].flatMap(x => [-18, 0, 18].map(y => <polygon key={`${x},${y}`} points={star(x, y, 6)} fill="#fffbea" />))}
        </>
    ),
    bigFish: ({ uid }) => (
        <>
            <defs>
                <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#0b3d91" />
                    <stop offset="1" stopColor="#12a594" />
                </linearGradient>
            </defs>
            <rect {...AREA} fill={`url(#${uid}-sea)`} />
            <ellipse cx="56" cy="0" rx="22" ry="12" fill="#ffc53d" />
            <polygon points="74,0 94,-14 94,14" fill="#ffc53d" />
            <circle cx="42" cy="-3" r="2.4" fill="#0b3d91" />
            {[20, 88].map(x => <path key={x} d={`M ${x},-40 q 4,8 0,16 q -4,8 0,16 q 4,8 0,16 q -4,8 0,16 q 4,8 0,16`} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />)}
        </>
    ),
};

/**
 * One flight, drawn flat in its own space (see above): the design cut to the
 * shape, with its edge. half: 'upper' or 'lower' draws only that half (a
 * wing of the turning dart). uid: unique on the page, for the cuts.
 */
export const FlightArt = ({ shape = 'standard', design = 'plain', color = '#46a758', uid, half = null }) => {
    const outline = FLIGHT_SHAPES[shape] ?? FLIGHT_SHAPES.standard;
    const paint = FLIGHT_DESIGNS[design] ?? FLIGHT_DESIGNS.plain;
    return (
        <g className="flight-art">
            <defs>
                <clipPath id={`${uid}-shape`}><path d={outline} /></clipPath>
                {half && <clipPath id={`${uid}-half`}><rect x="-10" y={half === 'upper' ? -50 : 0} width="125" height="50" /></clipPath>}
            </defs>
            <g clipPath={half ? `url(#${uid}-half)` : undefined}>
                <g clipPath={`url(#${uid}-shape)`}>{paint({ color, second: secondColorOf(color), uid })}</g>
                <path d={outline} className="flight-outline" />
            </g>
        </g>
    );
};

/**
 * A flight upright, as on the packet: the back up, where it sits on the
 * shaft down. For the gallery.
 */
export const FlightPicture = ({ className = '', ...flight }) => (
    <svg className={`flight-picture ${className}`} viewBox="-46 -106 92 112" aria-hidden="true">
        <g transform="rotate(-90)"><FlightArt {...flight} /></g>
    </svg>
);
