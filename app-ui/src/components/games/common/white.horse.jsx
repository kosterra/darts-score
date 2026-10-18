import useFleeting from './use.fleeting';

const DURATION_MS = 4200;

// a leg with its hoof, swinging from the hip; "front" legs swing the other way
const Leg = ({ x, front, late }) => (
    <g className={`horse-leg ${front ? 'is-front' : ''} ${late ? 'is-late' : ''}`} style={{ transformOrigin: `${x + 5}px 84px` }}>
        <rect x={x} y="80" width="10" height="44" rx="5" fill="#ebe6da" />
        <rect x={x - 1} y="118" width="12" height="8" rx="3" fill="#6b5a4a" />
    </g>
);

/**
 * A white horse galloping across the bottom of the screen, a rider waving on
 * its back: the White Horse of Cricket, three different trebles in one visit.
 * Over the game without catching a click, like the 180. "moment" is
 * { key, name, darts }.
 */
const WhiteHorse = ({ moment, onDone }) => {
    const leaving = useFleeting(moment, onDone, DURATION_MS);
    if (!moment) return null;

    return (
        <div key={moment.key} className={`white-horse ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="white-horse-banner">
                <span className="white-horse-title">White Horse!</span>
                <span className="white-horse-detail"><strong>{moment.name}</strong> · {moment.darts.join(' · ')}</span>
            </p>
            <div className="white-horse-run" aria-hidden="true">
                <div className="white-horse-bob">
                    <svg viewBox="0 0 210 140" className="white-horse-svg">
                        {/* the far legs first, a little darker */}
                        <Leg x={62} late />
                        <Leg x={128} front late />
                        <path className="horse-tail" d="M48 62 C28 58 20 78 16 96 C26 86 34 80 46 76 Z" fill="#d9d2c3" />
                        <ellipse cx="96" cy="68" rx="54" ry="25" fill="#f6f3ec" />
                        <path d="M132 58 C142 40 150 26 160 18 L176 30 C166 40 156 56 148 74 Z" fill="#f6f3ec" />
                        <path d="M136 52 C146 34 152 24 160 16 L154 14 C146 22 138 36 130 52 Z" fill="#cfc7b6" />
                        <ellipse cx="174" cy="30" rx="20" ry="11" transform="rotate(28 174 30)" fill="#f6f3ec" />
                        <path d="M160 14 L163 2 L169 14 Z" fill="#f6f3ec" />
                        <circle cx="172" cy="25" r="2.2" fill="#2b1d12" />
                        <circle cx="187" cy="40" r="1.6" fill="#8a7a6a" />
                        {/* the saddle cloth and the rider */}
                        <path d="M78 46 H116 L112 66 H82 Z" fill="#c8413a" />
                        <g className="horse-rider">
                            <rect x="88" y="22" width="18" height="26" rx="6" fill="#e9ac2f" />
                            <circle cx="97" cy="14" r="9" fill="#f2c29b" />
                            <path d="M87 12 Q97 0 107 12 Z" fill="#528b6e" />
                            <path d="M106 11 H113" stroke="#528b6e" strokeWidth="3" strokeLinecap="round" />
                            <g className="horse-rider-arm">
                                <rect x="102" y="24" width="6" height="20" rx="3" fill="#e9ac2f" />
                                <circle cx="105" cy="44" r="4" fill="#f2c29b" />
                            </g>
                        </g>
                        <Leg x={70} />
                        <Leg x={136} front />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default WhiteHorse;
