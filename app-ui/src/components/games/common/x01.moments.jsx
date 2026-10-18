import { Dragon, Gnome, Monster, Troll } from './one.eighty.figures';
import useFleeting from './use.fleeting';
import HatFigure from './hat.figure';

const DURATION_MS = 4400;
const FIGURES = [Gnome, Monster, Dragon, Troll];

// the frame of every moment: over the game, a banner, and the scene below it
export const Stage = ({ moment, onDone, className = '', title, detail, children }) => {
    const leaving = useFleeting(moment, onDone, DURATION_MS);
    if (!moment) return null;
    return (
        <div key={moment.key} className={`stage-moment ${className} ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="stage-moment-banner">
                <span className="stage-moment-title">{title}</span>
                <span className="stage-moment-detail">{detail}</span>
            </p>
            <div aria-hidden="true">{children}</div>
        </div>
    );
};

/**
 * The Big Fish, 170, the highest finish: a big fish leaps out of the water at
 * the bottom edge and dives back in. moment: { key, name }
 */
export const BigFish = ({ moment, onDone }) => (
    <Stage moment={moment} onDone={onDone} className="is-big-fish" title="The Big Fish!" detail={<><strong>{moment?.name}</strong> checks out 170</>}>
        <div className="big-fish-water" />
        <span className="big-fish-splash is-in" />
        <span className="big-fish-splash is-out" />
        <div className="big-fish-leap">
            <svg viewBox="0 0 200 100" className="big-fish">
                <path d="M150 50 L196 18 L188 50 L196 82 Z" fill="#3f8fbf" />
                <ellipse cx="88" cy="50" rx="72" ry="34" fill="#5cb3e0" />
                <path d="M30 50 Q88 92 150 52 Q88 70 30 50 Z" fill="#cfeaf7" />
                <path d="M80 18 Q96 2 118 20 Z" fill="#3f8fbf" />
                <path d="M92 70 Q102 92 116 74 Z" fill="#3f8fbf" />
                <circle cx="42" cy="42" r="7" fill="#fff" />
                <circle cx="40" cy="42" r="3.5" fill="#1d1d2b" />
                <path d="M18 56 Q26 62 34 58" stroke="#1d1d2b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M70 40 Q78 50 70 60 M86 38 Q94 50 86 62 M102 40 Q110 50 102 60" stroke="#3f8fbf" strokeWidth="2" fill="none" opacity="0.6" />
                <text x="92" y="57" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" stroke="#2a6f99" strokeWidth="1">170</text>
            </svg>
        </div>
    </Stage>
);

// sparks of one firework, all around its centre
const Burst = ({ x, y, delay, colour }) => (
    <span className="firework" style={{ left: `${x}%`, top: `${y}%`, '--delay': `${delay}s`, '--colour': colour }}>
        {Array.from({ length: 14 }, (_, index) => <span key={index} style={{ '--angle': `${index * (360 / 14)}deg` }} />)}
    </span>
);

/**
 * The nine-darter, the perfect leg: fireworks over the whole screen, and the
 * player's figure tipping its top hat. moment: { key, name, playerIndex }
 */
export const PerfectLeg = ({ moment, onDone }) => (
    <Stage moment={moment} onDone={onDone} className="is-perfect" title="Perfect leg!" detail={<>A nine-darter by <strong>{moment?.name}</strong></>}>
        {[[18, 28, 0, '#ffc94d'], [78, 22, 0.35, '#7ecca5'], [50, 16, 0.7, '#fff3c4'], [30, 50, 1.05, '#c3a9e6'], [70, 48, 1.4, '#ffc94d'], [12, 62, 1.75, '#86bfe6'], [88, 60, 2.1, '#ff8a6b'], [50, 38, 2.45, '#7ecca5']].map(([x, y, delay, colour]) => (
            <Burst key={`${x}-${y}`} x={x} y={y} delay={delay} colour={colour} />
        ))}
        <div className="hat-trick-stage">
            <HatFigure playerIndex={moment?.playerIndex ?? 0} />
        </div>
    </Stage>
);

/**
 * A finish on the bull: a dart flies in and lands in the bullseye.
 * moment: { key, name, checkout }
 */
export const BullFinish = ({ moment, onDone }) => (
    <Stage moment={moment} onDone={onDone} className="is-bull" title="Bullseye finish!" detail={<><strong>{moment?.name}</strong> checks out {moment?.checkout} on the bull</>}>
        <div className="bull-target">
            <svg viewBox="0 0 120 120" className="bull-board">
                <circle cx="60" cy="60" r="58" fill="#1d1c1a" />
                <circle cx="60" cy="60" r="46" fill="#efe6d0" />
                <circle cx="60" cy="60" r="34" fill="#528b6e" />
                <circle cx="60" cy="60" r="22" fill="#efe6d0" />
                <circle cx="60" cy="60" r="12" fill="#528b6e" />
                <circle cx="60" cy="60" r="6" fill="#d24d3c" />
            </svg>
            <span className="bull-ring" />
            <span className="bull-ring is-late" />
            <svg viewBox="0 0 120 30" className="bull-dart">
                <path d="M0 15 L14 6 L14 24 Z" fill="#c8413a" />
                <path d="M4 15 L14 2 L22 15 L14 28 Z" fill="#e9ac2f" opacity="0.9" />
                <rect x="20" y="12" width="50" height="6" rx="3" fill="#9aa3ad" />
                <rect x="40" y="11" width="18" height="8" rx="2" fill="#5f6873" />
                <path d="M70 13 L118 15 L70 17 Z" fill="#d6dbe0" />
            </svg>
        </div>
    </Stage>
);

/**
 * Bed and Breakfast, 26 with single 20, single 5 and single 1: a bed slides
 * in with the player's figure asleep, a coffee next to it.
 * moment: { key, name, playerIndex }
 */
export const BedAndBreakfast = ({ moment, onDone }) => {
    const Figure = FIGURES[(moment?.playerIndex ?? 0) % FIGURES.length];
    return (
        <Stage moment={moment} onDone={onDone} className="is-bed" title="Bed and Breakfast" detail={<><strong>{moment?.name}</strong> · S20 · S5 · S1 · 26</>}>
            <div className="bed-scene">
                <svg viewBox="0 0 260 130" className="bed-svg">
                    {/* the sleeper lies with the head on the pillow, under the blanket */}
                    <g transform="translate(64 26) rotate(-90 40 50) scale(0.62)">
                        <Figure sign={false} />
                    </g>
                    <rect x="10" y="74" width="200" height="22" rx="6" fill="#efe6d0" />
                    <rect x="14" y="56" width="52" height="22" rx="10" fill="#fff" />
                    <path d="M70 60 Q140 48 206 62 L206 90 H70 Z" fill="#528b6e" />
                    <path d="M70 60 Q140 48 206 62" stroke="#3f6e56" strokeWidth="3" fill="none" />
                    <rect x="2" y="34" width="12" height="90" rx="4" fill="#8a5f2e" />
                    <rect x="204" y="58" width="12" height="66" rx="4" fill="#8a5f2e" />
                    <rect x="2" y="94" width="214" height="12" rx="4" fill="#a9825a" />
                    {/* breakfast on the bedside table */}
                    <rect x="224" y="86" width="34" height="8" rx="2" fill="#8a5f2e" />
                    <rect x="236" y="94" width="10" height="30" fill="#8a5f2e" />
                    <path d="M232 70 H250 L248 86 H234 Z" fill="#f1ece2" />
                    <path d="M250 74 Q258 76 250 82" stroke="#f1ece2" strokeWidth="3" fill="none" />
                    <path className="bed-steam" d="M238 64 Q234 56 240 50 Q246 44 240 36" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
                <span className="bed-z">z</span><span className="bed-z">z</span><span className="bed-z">Z</span>
            </div>
        </Stage>
    );
};
