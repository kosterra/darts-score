// Little fantasy figures that pop up from the bottom edge for a 180, each
// holding a cardboard sign. Drawn in one 120×170 box; the body runs out at the
// bottom, so they seem to come out of the edge of the screen.

const MARKER_FONT = "'Marker Felt', 'Chalkboard SE', 'Comic Sans MS', 'Comic Neue', cursive";

// the cardboard sign, held at both edges by the figure's hands
const Sign = ({ hand, tilt }) => (
    <g transform={`rotate(${tilt} 60 88)`}>
        <rect x="12" y="64" width="96" height="48" rx="3" fill="#c99a5b" stroke="#8a5f2e" strokeWidth="2" />
        <path d="M16 70 H104 M16 106 H104" stroke="#b78748" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d="M95 64 L108 64 L108 75 Z" fill="#b07f45" />
        <text x="60" y="100" textAnchor="middle" fontSize="33" fontWeight="900" fill="#2b1d12" fontFamily={MARKER_FONT}>180</text>
        <circle cx="13" cy="88" r="7.5" fill={hand} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
        <circle cx="107" cy="88" r="7.5" fill={hand} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
    </g>
);

// the hands at the sides, for a figure without a sign
const Hands = ({ hand }) => (
    <>
        <circle cx="20" cy="112" r="7.5" fill={hand} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
        <circle cx="100" cy="112" r="7.5" fill={hand} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
    </>
);

export const Gnome = ({ sign = true }) => (
    <>
        <path d="M28 170 L34 100 Q60 88 86 100 L92 170 Z" fill="#3d6fb6" />
        <path d="M40 50 Q38 92 60 104 Q82 92 80 50 Z" fill="#f1ece2" />
        <circle cx="60" cy="46" r="15" fill="#f2c29b" />
        <circle cx="54" cy="43" r="2" fill="#2b1d12" />
        <circle cx="66" cy="43" r="2" fill="#2b1d12" />
        <path d="M44 51 Q60 60 76 51 Q78 66 60 68 Q42 66 44 51 Z" fill="#f1ece2" />
        <circle cx="60" cy="50" r="5" fill="#e59a7a" />
        <path d="M40 40 L57 1 Q60 -1 62 2 L80 40 Q60 46 40 40 Z" fill="#c8413a" />
        {sign ? <Sign hand="#f2c29b" tilt={-4} /> : <Hands hand="#f2c29b" />}
    </>
);

export const Monster = ({ sign = true }) => (
    <>
        <path d="M36 30 L28 6 L48 24 Z M84 30 L92 6 L72 24 Z" fill="#f4e3b5" />
        <path d="M22 170 L24 60 Q24 20 60 20 Q96 20 96 60 L98 170 Z" fill="#5b8def" />
        <circle cx="60" cy="40" r="12" fill="#fff" />
        <circle cx="62" cy="41" r="6" fill="#1d1d2b" />
        <circle cx="64" cy="38.5" r="2" fill="#fff" />
        <path d="M47 55 Q60 64 73 55" fill="#1d1d2b" />
        <path d="M54 57.5 L56 61 L58 58.5 Z M62 58.5 L64 61 L66 57.5 Z" fill="#fff" />
        {sign ? <Sign hand="#5b8def" tilt={3} /> : <Hands hand="#5b8def" />}
    </>
);

export const Dragon = ({ sign = true }) => (
    <>
        <path d="M34 170 L38 80 Q60 70 82 80 L86 170 Z" fill="#8e6bd1" />
        <path d="M42 28 L46 10 L53 24 L60 4 L67 24 L74 10 L78 28 Z" fill="#f0b542" />
        <ellipse cx="60" cy="40" rx="24" ry="20" fill="#8e6bd1" />
        <ellipse cx="60" cy="53" rx="15" ry="9" fill="#a98ae0" />
        <circle cx="55" cy="52" r="1.8" fill="#3a2a5c" />
        <circle cx="65" cy="52" r="1.8" fill="#3a2a5c" />
        <circle cx="50" cy="36" r="5" fill="#ffd75a" />
        <circle cx="70" cy="36" r="5" fill="#ffd75a" />
        <ellipse cx="50" cy="36" rx="1.6" ry="4" fill="#2b1d12" />
        <ellipse cx="70" cy="36" rx="1.6" ry="4" fill="#2b1d12" />
        {sign ? <Sign hand="#8e6bd1" tilt={-2} /> : <Hands hand="#8e6bd1" />}
    </>
);

export const Troll = ({ sign = true }) => (
    <>
        <path d="M26 170 L32 96 Q60 84 88 96 L94 170 Z" fill="#8a6a45" />
        <path d="M40 38 L6 26 L38 54 Z M80 38 L114 26 L82 54 Z" fill="#7aa65a" />
        <path d="M36 41 L16 32 L36 49 Z M84 41 L104 32 L84 49 Z" fill="#5d8a42" />
        <path d="M53 23 Q57 8 61 22 Q66 10 68 25 Z" fill="#3b3024" />
        <ellipse cx="60" cy="42" rx="22" ry="22" fill="#7aa65a" />
        <circle cx="52" cy="37" r="4.5" fill="#fff" />
        <circle cx="68" cy="37" r="4.5" fill="#fff" />
        <circle cx="53" cy="38" r="2.2" fill="#1d1d2b" />
        <circle cx="67" cy="38" r="2.2" fill="#1d1d2b" />
        <ellipse cx="60" cy="47" rx="6" ry="5" fill="#5d8a42" />
        <path d="M47 55 Q60 63 73 55" stroke="#2f3d22" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M50 56 L52 50 L54 57.5 Z M66 57.5 L68 50 L70 56 Z" fill="#fff" />
        {sign ? <Sign hand="#7aa65a" tilt={4} /> : <Hands hand="#7aa65a" />}
    </>
);

// who comes up, in which order and how they wobble: rock sways, bob hops
const FIGURES = [
    { Figure: Gnome, wobble: 'rock', delay: 0.15 },
    { Figure: Monster, wobble: 'bob', delay: 0.35 },
    { Figure: Dragon, wobble: 'rock', delay: 0.05 },
    { Figure: Troll, wobble: 'bob', delay: 0.25 },
];

const OneEightyFigures = () => (
    <div className="one-eighty-crowd" aria-hidden="true">
        {FIGURES.map(({ Figure, wobble, delay }, index) => (
            <div key={index} className="one-eighty-figure" style={{ '--delay': `${delay}s` }}>
                <div className={`one-eighty-figure-wobble is-${wobble}`}>
                    <svg viewBox="0 0 120 170" role="presentation">
                        <Figure />
                    </svg>
                </div>
            </div>
        ))}
    </div>
);

export default OneEightyFigures;
