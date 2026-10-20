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
    diamond: 'M 18,0 L 62,-30 L 100,0 L 62,30 Z',
    fin: 'M 0,0 C 20,-20 40,-34 90,-34 L 100,-34 L 93,-22 L 100,-11 L 93,0 L 100,11 L 93,22 L 100,34 L 90,34 C 40,34 20,20 0,0 Z',
    sigma: 'M 0,0 Q 40,-10 62,-40 L 100,0 L 62,40 Q 40,10 0,0 Z',
    vwing: 'M 0,0 C 30,-14 60,-30 100,-40 L 80,0 L 100,40 C 60,30 30,14 0,0 Z',
    tomahawk: 'M 0,0 L 40,-16 C 50,-12 52,-30 62,-34 L 100,-36 C 104,-12 104,12 100,36 L 62,34 C 52,30 50,12 40,16 Z',
    skull: 'M 6,-12 L 38,-18 C 46,-34 68,-42 90,-36 C 104,-26 104,26 90,36 C 68,42 46,34 38,18 L 6,12 Q 0,0 6,-12 Z',
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

// a few fixed points, scattered but always the same (stars, bubbles)
const SCATTER = [[8, -30], [14, 22], [22, -8], [27, 34], [33, -36], [36, 10], [44, -22], [47, 30], [52, -4], [58, 24], [61, -32], [66, 6], [71, -16], [74, 34], [80, -26], [83, 14], [88, -6], [92, 28], [95, -36], [98, 4]];
const gradient = (id, stops, { x2 = '1', y2 = '0' } = {}) => (
    <defs>
        <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
            {stops.map((color, index) => <stop key={index} offset={index / (stops.length - 1)} stopColor={color} />)}
        </linearGradient>
    </defs>
);
// text upright on the flight as it stands in the gallery
const upright = (text, size, fillColor, x = 58) => (
    <text x={x} y="0" transform={`rotate(90 ${x} 0)`} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight="900" fill={fillColor}>{text}</text>
);

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
    tartan: ({ color, second }) => (
        <>
            {fill(color)}
            {[16, 52, 86].map(x => <rect key={`x${x}`} x={x} y={AREA.y} width="9" height={AREA.height} fill={second} opacity="0.45" />)}
            {[-30, -4, 22].map(y => <rect key={`y${y}`} x={AREA.x} y={y} width={AREA.width} height="9" fill={second} opacity="0.45" />)}
            {[30, 70].map(x => <line key={`l${x}`} x1={x} y1="-50" x2={x} y2="50" stroke="#000" strokeWidth="1.2" opacity="0.35" />)}
            {[-16, 12].map(y => <line key={`m${y}`} x1="-10" y1={y} x2="115" y2={y} stroke="#000" strokeWidth="1.2" opacity="0.35" />)}
        </>
    ),
    zebra: () => (
        <>
            {fill('#f2f2f2')}
            {range(0, 100, 16).map(x => <path key={x} d={`M ${x},-50 C ${x + 12},-20 ${x - 8},12 ${x + 6},50 L ${x + 13},50 C ${x},12 ${x + 19},-20 ${x + 8},-50 Z`} fill="#151515" />)}
        </>
    ),
    camo: () => (
        <>
            {fill('#4b5d3a')}
            {[[12, -20, 16, 10, '#6b7f4b'], [40, 18, 18, 12, '#2f3a24'], [62, -24, 20, 11, '#8a8a5c'], [84, 10, 16, 14, '#6b7f4b'], [30, -6, 10, 8, '#8a8a5c'], [70, 28, 14, 8, '#2f3a24'], [92, -30, 12, 10, '#2f3a24'], [52, 2, 12, 9, '#6b7f4b']]
                .map(([cx, cy, rx, ry, color]) => <ellipse key={`${cx},${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${cx % 60 - 30} ${cx} ${cy})`} fill={color} />)}
        </>
    ),
    feathers: () => (
        <>
            {fill('#efe6d2')}
            {range(4, 98, 6).flatMap(x => [
                <line key={`u${x}`} x1={x} y1="0" x2={x + 16} y2="-44" stroke="#8a5a2b" strokeWidth="1.1" />,
                <line key={`d${x}`} x1={x} y1="0" x2={x + 16} y2="44" stroke="#8a5a2b" strokeWidth="1.1" />,
            ])}
            <rect x="84" y={AREA.y} width="30" height={AREA.height} fill="#3b2a1a" opacity="0.55" />
            <line x1="-10" y1="0" x2="115" y2="0" stroke="#5a3a1b" strokeWidth="2.4" />
        </>
    ),
    ice: () => (
        <>
            {fill('#cdeefe')}
            {[['0,0 40,-40 30,0', '#a8dcf7'], ['30,0 40,-40 70,-10', '#e6f7ff'], ['30,0 70,-10 60,30', '#92d0f2'], ['30,0 60,30 10,40', '#b9e5fb'], ['70,-10 100,-40 110,10', '#a8dcf7'], ['60,30 70,-10 110,10', '#d8f2ff'], ['60,30 110,10 100,50', '#8ccbee']]
                .map(([points, color]) => <polygon key={points} points={points} fill={color} stroke="#ffffff" strokeWidth="0.8" />)}
        </>
    ),
    galaxy: ({ uid }) => (
        <>
            <defs>
                <radialGradient id={`${uid}-galaxy`} cx="0.6" cy="0.5" r="0.7">
                    <stop offset="0" stopColor="#4a1d7a" />
                    <stop offset="1" stopColor="#05010d" />
                </radialGradient>
            </defs>
            <rect {...AREA} fill={`url(#${uid}-galaxy)`} />
            <ellipse cx="60" cy="-4" rx="30" ry="12" transform="rotate(-25 60 -4)" fill="#e93d82" opacity="0.28" />
            <ellipse cx="54" cy="8" rx="22" ry="8" transform="rotate(20 54 8)" fill="#0090ff" opacity="0.25" />
            {SCATTER.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 4 ? 0.9 : 1.6} fill="#ffffff" />)}
        </>
    ),
    lava: () => (
        <>
            {fill('#160a06')}
            {['M -4,-30 L 20,-18 L 34,-26 L 52,-8 L 70,-14 L 90,4 L 110,-6', 'M -4,20 L 16,8 L 30,22 L 48,12 L 64,30 L 84,18 L 110,30', 'M 34,-26 L 30,-50', 'M 52,-8 L 48,12', 'M 70,-14 L 82,-48', 'M 64,30 L 70,50']
                .flatMap(d => [<path key={`g${d}`} d={d} fill="none" stroke="#ff6a00" strokeWidth="4" strokeLinejoin="round" />, <path key={`c${d}`} d={d} fill="none" stroke="#ffd166" strokeWidth="1.4" strokeLinejoin="round" />])}
        </>
    ),
    dragonScale: () => (
        <>
            {fill('#0e3b2a')}
            {range(0, 108, 12).flatMap(x => range(-48, 48, 12).map(y => {
                const shift = (x / 12) % 2 ? 6 : 0;
                return <path key={`${x},${y}`} d={`M ${x},${y + shift - 6} A 7,7 0 0 1 ${x},${y + shift + 6}`} fill="#1b5e3f" stroke="#3fbf7f" strokeWidth="1.4" />;
            }))}
        </>
    ),
    pint: ({ uid }) => (
        <>
            {gradient(`${uid}-beer`, ['#f7b733', '#c97a0a'])}
            <rect {...AREA} fill={`url(#${uid}-beer)`} />
            {SCATTER.filter(([x]) => x < 76).map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 3 ? 1 : 1.8} fill="#ffe08a" opacity="0.7" />)}
            <path d="M 76,-50 Q 72,-30 78,-14 Q 72,0 78,14 Q 72,30 76,50 L 115,50 L 115,-50 Z" fill="#fff6e0" />
        </>
    ),
    crest: () => (
        <>
            {fill('#1d3b2c')}
            <path d="M 74,-18 L 74,18 L 56,18 Q 42,16 34,0 Q 42,-16 56,-18 Z" fill="#e9ac2f" stroke="#fff1b0" strokeWidth="1.2" />
            <line x1="40" y1="-10" x2="70" y2="10" stroke="#1d3b2c" strokeWidth="2.4" />
            <line x1="40" y1="10" x2="70" y2="-10" stroke="#1d3b2c" strokeWidth="2.4" />
            <circle cx="56" cy="0" r="3" fill="#1d3b2c" />
        </>
    ),
    racing: ({ color }) => (
        <>
            {fill('#1a1c1f')}
            <rect x={AREA.x} y="-11" width={AREA.width} height="7" fill={color} />
            <rect x={AREA.x} y="4" width={AREA.width} height="7" fill={color} />
            <rect x={AREA.x} y="-2" width={AREA.width} height="4" fill="#f2f2f2" />
        </>
    ),
    heraldic: ({ color, second }) => (
        <>
            {fill(second)}
            <rect x="50" y="0" width="65" height="50" fill={color} />
            <rect x="-10" y="-50" width="60" height="50" fill={color} />
            <line x1="50" y1="-50" x2="50" y2="50" stroke="#e9ac2f" strokeWidth="3" />
            <line x1="-10" y1="0" x2="115" y2="0" stroke="#e9ac2f" strokeWidth="3" />
        </>
    ),
    proTour: () => (
        <>
            {fill('#0d0d0d')}
            {[0, 30, 60, 90].map(x => <polygon key={x} points={`${x},-50 ${x + 8},-50 ${x - 12},50 ${x - 20},50`} fill="#e9ac2f" opacity="0.85" />)}
            {upright('PRO', 19, '#ffc53d')}
        </>
    ),
    globe: () => (
        <>
            {fill('#0b2a5b')}
            <circle cx="58" cy="0" r="30" fill="#103a7a" stroke="#7fb3ff" strokeWidth="1.4" />
            {[10, 20, 30].map(rx => <ellipse key={rx} cx="58" cy="0" rx={rx} ry="30" fill="none" stroke="#7fb3ff" strokeWidth="1" />)}
            {[-15, 0, 15].map(y => <line key={y} x1={58 - Math.sqrt(900 - y * y)} y1={y} x2={58 + Math.sqrt(900 - y * y)} y2={y} stroke="#7fb3ff" strokeWidth="1" />)}
            <path d="M 50,-20 Q 60,-26 66,-14 Q 60,-6 66,4 Q 54,8 48,-4 Z" fill="#46a758" opacity="0.85" />
            <path d="M 62,10 Q 74,8 76,20 Q 66,24 60,18 Z" fill="#46a758" opacity="0.85" />
        </>
    ),
    crown: ({ uid }) => (
        <>
            {gradient(`${uid}-royal`, ['#4b1070', '#1a0428'])}
            <rect {...AREA} fill={`url(#${uid}-royal)`} />
            <polygon points="38,-24 72,-26 56,-12 76,0 56,12 72,26 38,24" fill="#e9ac2f" stroke="#fff1b0" strokeWidth="1" />
            {[[72, -26], [76, 0], [72, 26]].map(([x, y]) => <circle key={y} cx={x} cy={y} r="3" fill="#e5484d" />)}
            <rect x="38" y="-24" width="6" height="48" fill="#b8860b" />
        </>
    ),
    oche: () => (
        <>
            {fill('#8b5a2b')}
            {range(-40, 40, 10).map(y => <line key={y} x1="-10" y1={y} x2="115" y2={y} stroke="#5e3a19" strokeWidth="1.3" />)}
            {range(-35, 35, 10).map((y, index) => <line key={`k${y}`} x1={20 + (index * 23) % 70} y1={y} x2={20 + (index * 23) % 70} y2={y + 10} stroke="#5e3a19" strokeWidth="1" />)}
            <rect x="30" y={AREA.y} width="7" height={AREA.height} fill="#f2f2f2" />
        </>
    ),
    ton: () => (
        <>
            {fill('#c62828')}
            {range(0, 11, 1).map(index => <path key={index} d={wedge(58, 0, 80, index * 30 - 6, index * 30 + 6)} fill="#ff8a80" opacity="0.3" />)}
            {upright('100', 24, '#ffffff')}
        </>
    ),
    tungsten: ({ uid }) => (
        <>
            {gradient(`${uid}-metal`, ['#e8ecef', '#9aa5b1', '#eef2f4', '#6b7580', '#cfd6dc'], { x2: '0', y2: '1' })}
            <rect {...AREA} fill={`url(#${uid}-metal)`} />
            {range(-48, 48, 3).map(y => <line key={y} x1="-10" y1={y} x2="115" y2={y} stroke="#ffffff" strokeWidth="0.4" opacity="0.35" />)}
            {range(14, 98, 12).map(x => <line key={`r${x}`} x1={x} y1="-50" x2={x} y2="50" stroke="#4b545e" strokeWidth="1.6" opacity="0.6" />)}
        </>
    ),
    neon: () => (
        <>
            {fill('#0a0614')}
            <circle cx="72" cy="0" r="16" fill="#ff4fd8" opacity="0.9" />
            {[-9, -3, 3, 9].map(y => <rect key={y} x="56" y={y} width="32" height="1.6" fill="#0a0614" />)}
            {range(-40, 40, 10).map(y => <line key={y} x1="-10" y1={y} x2="50" y2={y * 0.4} stroke="#22d3ee" strokeWidth="1.2" />)}
            {range(4, 48, 9).map(x => <line key={`h${x}`} x1={x} y1="-50" x2={x} y2="50" stroke="#22d3ee" strokeWidth="1" opacity="0.8" />)}
        </>
    ),
    goldLeaf: ({ uid }) => (
        <>
            {gradient(`${uid}-leaf`, ['#fff1b0', '#e9ac2f', '#b8860b', '#ffd76a'], { x2: '1', y2: '1' })}
            <rect {...AREA} fill={`url(#${uid}-leaf)`} />
            {['0,-20 26,-34 34,-6 10,4', '40,10 66,-4 74,26 50,34', '64,-36 92,-28 86,-6 70,-12', '82,14 104,4 106,30 88,32']
                .map(points => <polygon key={points} points={points} fill="#fff6c8" opacity="0.35" stroke="#9a6a12" strokeWidth="0.8" />)}
        </>
    ),
    trophy: () => (
        <>
            {fill('#0f1d3a')}
            <path d="M 74,-17 L 74,17 Q 58,17 51,4 L 51,-4 Q 58,-17 74,-17 Z" fill="#e9ac2f" />
            <path d="M 70,-17 C 70,-28 57,-27 57,-13" fill="none" stroke="#e9ac2f" strokeWidth="2.6" />
            <path d="M 70,17 C 70,28 57,27 57,13" fill="none" stroke="#e9ac2f" strokeWidth="2.6" />
            <rect x="40" y="-3" width="11" height="6" fill="#e9ac2f" />
            <rect x="33" y="-12" width="7" height="24" rx="1.5" fill="#b8860b" />
            <polygon points={star(86, 0, 6)} fill="#fff1b0" />
        </>
    ),
    laurel: () => (
        <>
            {fill('#12301f')}
            {[...range(35, 165, 16), ...range(195, 325, 16)].map(angle => {
                const [x, y] = polar(55, 0, 24, angle);
                return <ellipse key={angle} cx={x} cy={y} rx="6.5" ry="2.6" transform={`rotate(${angle + 90} ${x} ${y})`} fill="#e9ac2f" />;
            })}
            <circle cx="55" cy="0" r="24" fill="none" stroke="#b8860b" strokeWidth="1" strokeDasharray="60 40" />
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
 * wing of the turning dart); shadeRef: a dark layer over it whose opacity
 * the turning dart sets, as the wing turns away. uid: unique on the page,
 * for the cuts.
 */
export const FlightArt = ({ shape = 'standard', design = 'plain', color = '#46a758', uid, half = null, shadeRef = null }) => {
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
                {shadeRef && <path ref={shadeRef} d={outline} fill="#000000" opacity="0" />}
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
