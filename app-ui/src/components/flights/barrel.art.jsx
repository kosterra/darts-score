import { BARRELS, FINISHES, PROFILES } from './barrels';

// the barrels as drawings (see barrels.js)

const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

// the grip cut into the barrel
const Grip = ({ kind, profile, color }) => {
    const [from, to] = profile.grip;
    const r = profile.radius;
    if (kind === 'rings') return range(from, to, 3).map(x => <line key={x} x1={x} y1={-r} x2={x} y2={r} stroke={color} strokeWidth="0.7" />);
    if (kind === 'fineRings') return range(from, to, 1.6).map(x => <line key={x} x1={x} y1={-r} x2={x} y2={r} stroke={color} strokeWidth="0.45" />);
    if (kind === 'scallop') {
        return range(from, to - 3, 4.5).flatMap(x => [-r * 0.45, r * 0.45].map(y => (
            <ellipse key={`${x},${y}`} cx={x + 2} cy={y} rx="1.7" ry={r * 0.32} fill={color} />
        )));
    }
    if (kind === 'shark') return range(from, to, 2.4).map(x => <path key={x} d={`M ${x},${-r} L ${x + 1.8},0 L ${x},${r}`} fill="none" stroke={color} strokeWidth="0.6" />);
    if (kind === 'pixel') {
        return range(from, to - 1, 2.2).flatMap((x, column) => range(-r + 0.6, r - 1.6, 2.2).map(y => (
            <rect key={`${x},${y}`} x={x} y={y + (column % 2 ? 1.1 : 0)} width="1.2" height="1.2" fill={color} />
        )));
    }
    return null;
};

/**
 * One barrel on the dart from the side, between x 30 and 80. uid: unique on
 * the page, for its gradients and cut.
 */
export const BarrelArt = ({ barrel = 'classic', uid }) => {
    const spec = BARRELS[barrel] ?? BARRELS.classic;
    const profile = PROFILES[spec.profile];
    const finish = FINISHES[spec.finish];
    return (
        <g className="barrel-art">
            <defs>
                <linearGradient id={`${uid}-finish`} x1="0" y1="0" x2="0" y2="1">
                    {finish.stops.map((color, index) => <stop key={index} offset={[0, 0.38, 0.62, 1][index]} stopColor={color} />)}
                </linearGradient>
                {finish.rainbow && (
                    <linearGradient id={`${uid}-rainbow`} x1="0" y1="0" x2="1" y2="0">
                        {['#ff5f6d', '#ffc371', '#5ef2a5', '#4fc3f7', '#a78bfa', '#ff5f6d'].map((color, index) => <stop key={index} offset={index / 5} stopColor={color} />)}
                    </linearGradient>
                )}
                <clipPath id={`${uid}-cut`}><path d={profile.path} /></clipPath>
            </defs>
            <path d={profile.path} fill={`url(#${uid}-finish)`} />
            {finish.rainbow && <path d={profile.path} fill={`url(#${uid}-rainbow)`} opacity="0.55" style={{ mixBlendMode: 'color' }} />}
            <g clipPath={`url(#${uid}-cut)`}><Grip kind={spec.grip} profile={profile} color={finish.grip} /></g>
        </g>
    );
};

/**
 * A barrel upright, point down, for the gallery.
 */
export const BarrelPicture = ({ barrel, uid, className = '' }) => (
    <svg className={`flight-picture barrel-picture ${className}`} viewBox="-7 -84 14 58" aria-hidden="true">
        <g transform="rotate(-90)"><BarrelArt barrel={barrel} uid={uid} /></g>
    </svg>
);
