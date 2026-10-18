import { Dragon, Gnome, Monster, Troll } from './one.eighty.figures';
import useFleeting from './use.fleeting';

const DURATION_MS = 4200;
const FIGURES = [Gnome, Monster, Dragon, Troll];

// the house the victim had reached, with their name and score on it
const House = ({ name, score }) => (
    <svg viewBox="0 0 120 112" className="knock-house" aria-hidden="true">
        <path d="M6 52 L60 8 L114 52 Z" fill="#8a4f3b" />
        <path d="M14 50 H106 V112 H14 Z" fill="#c9a27a" />
        <path d="M14 50 H106 V56 H14 Z" fill="#a9825a" />
        <rect x="48" y="70" width="24" height="42" rx="3" fill="#5a3a28" />
        <circle cx="67" cy="92" r="1.8" fill="#e9ac2f" />
        <rect x="22" y="66" width="18" height="16" rx="2" fill="#f5e6b8" stroke="#8a4f3b" strokeWidth="2" />
        <rect x="80" y="66" width="18" height="16" rx="2" fill="#f5e6b8" stroke="#8a4f3b" strokeWidth="2" />
        {/* the name plate under the roof */}
        <rect x="30" y="30" width="60" height="18" rx="3" fill="#f1ece2" stroke="#5a3a28" strokeWidth="1.5" />
        <text x="60" y="43" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2b1d12">{`${name} · ${score}`.slice(0, 16)}</text>
    </svg>
);

// home: a little hut at the start, with a 0 on its flag
const Home = () => (
    <svg viewBox="0 0 70 80" className="knock-home" aria-hidden="true">
        <path d="M50 4 V40" stroke="#5a3a28" strokeWidth="2.5" />
        <path d="M51 5 L68 11 L51 17 Z" fill="#e9ac2f" />
        <text x="58" y="15" textAnchor="middle" fontSize="9" fontWeight="900" fill="#2b1d12">0</text>
        <path d="M4 50 L30 28 L56 50 Z" fill="#6b4a37" />
        <path d="M9 48 H51 V80 H9 Z" fill="#a9825a" />
        <rect x="23" y="60" width="14" height="20" rx="2" fill="#4a3022" />
    </svg>
);

// a ladder towards the target, with the target score on a flag at the top
const Ladder = ({ target }) => (
    <svg viewBox="0 0 60 220" className="knock-ladder" aria-hidden="true">
        <path d="M14 220 L18 40 M46 220 L42 40" stroke="#a9825a" strokeWidth="5" strokeLinecap="round" />
        {[200, 175, 150, 125, 100, 75, 50].map(y => <path key={y} d={`M${15 + (220 - y) * 0.02} ${y} H${45 - (220 - y) * 0.02}`} stroke="#c9a27a" strokeWidth="4" strokeLinecap="round" />)}
        <path d="M30 40 V6" stroke="#5a3a28" strokeWidth="2.5" />
        <path d="M31 7 L56 14 L31 21 Z" fill="#e9ac2f" />
        <text x="42" y="17" textAnchor="middle" fontSize="8" fontWeight="900" fill="#2b1d12">{target}</text>
    </svg>
);

// a bowling ball with its finger holes
const Ball = () => (
    <svg viewBox="0 0 40 40" className="knock-ball" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#2d4b8a" />
        <circle cx="14" cy="13" r="3" fill="#162645" />
        <circle cx="22" cy="11" r="3" fill="#162645" />
        <circle cx="19" cy="20" r="3.4" fill="#162645" />
        <path d="M8 26 Q14 34 26 33" stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
);

const names = (list) => list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0];

// the figure of a player, never the same as the one next to it in a scene
const figureFor = (index, avoid) => {
    const figure = index % FIGURES.length === avoid % FIGURES.length ? index + 1 : index;
    return FIGURES[figure % FIGURES.length];
};

/**
 * When a player lands on an opponent's score in Elimination: a figure walks
 * up to the opponent's house, kicks them out, and they fly back home to 0;
 * on a finish they are kicked off the ladder to the target ("So close!");
 * sending back the one who sent you back is "Revenge!"; two or more at once
 * fall like bowling pins ("Strike!"). Like the 180 it lies over the game
 * without catching a click: the next player throws on, and a click, tap or
 * key lets it fade.
 *
 * knockOut: { key, kind, by, byIndex, victims: [{ name, index, score, left }], target }
 */
const KnockOut = ({ knockOut, onDone }) => {
    const leaving = useFleeting(knockOut, onDone, DURATION_MS);
    if (!knockOut) return null;

    const { kind = 'kick', by, byIndex, victims } = knockOut;
    const Attacker = FIGURES[byIndex % FIGURES.length];
    const [victim] = victims;
    const Victim = figureFor(victim.index, byIndex);
    const banner = {
        kick: { detail: <><strong>{by}</strong> sends <strong>{victim.name}</strong> back to 0!</> },
        revenge: { title: 'Revenge!', detail: <><strong>{by}</strong> pays <strong>{victim.name}</strong> back: back to 0</> },
        close: { title: 'So close!', detail: <><strong>{victim.name}</strong> was {victim.left} from the target: back to 0</> },
        strike: { title: 'Strike!', detail: <><strong>{by}</strong> sends <strong>{names(victims.map(entry => entry.name))}</strong> back to 0</> },
    }[kind];

    return (
        <div key={knockOut.key} className={`knock-out is-${kind} ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <div className="knock-banner">
                {banner.title && <span className="knock-title">{banner.title}</span>}
                <span className="knock-detail">{banner.detail}</span>
            </div>
            {kind === 'strike'
                ? (
                    <div className="knock-scene" aria-hidden="true">
                        <div className="knock-bowler">
                            <svg viewBox="0 0 120 170" className="knock-figure"><Attacker sign={false} /></svg>
                        </div>
                        <div className="knock-ball-run"><Ball /></div>
                        {victims.slice(0, 4).map((entry, index) => {
                            const Pin = figureFor(entry.index, byIndex);
                            return (
                                <div key={entry.name + index} className="knock-pin" style={{ '--slot': index, '--dir': index % 2 ? 1 : -1 }}>
                                    <svg viewBox="0 0 120 170" className="knock-figure"><Pin sign={false} /></svg>
                                </div>
                            );
                        })}
                    </div>
                )
                : (
                    <div className="knock-scene" aria-hidden="true">
                        <Home />
                        {kind === 'close'
                            ? <Ladder target={victim.score + victim.left} />
                            : <House name={victim.name} score={victim.score} />}
                        <div className="knock-victim">
                            <div className="knock-victim-arc">
                                <svg viewBox="0 0 120 170" className="knock-figure"><Victim sign={false} /></svg>
                            </div>
                        </div>
                        <span className="knock-puff" />
                        {/* the dust where they land at home */}
                        <span className="knock-landing">
                            <span /><span /><span />
                        </span>
                        <div className="knock-attacker">
                            {/* revenge: dusting off the hands afterwards */}
                            {kind === 'revenge' && <><span className="knock-hand-dust is-left" /><span className="knock-hand-dust is-right" /></>}
                            <svg viewBox="0 0 120 170" className="knock-figure">
                                {/* the kicking leg, behind the body until it swings out */}
                                <g className="knock-leg">
                                    <rect x="63" y="118" width="17" height="58" rx="7" fill="#4a3a2c" />
                                    <ellipse cx="82" cy="176" rx="17" ry="10" fill="#2b1d12" />
                                </g>
                                <Attacker sign={false} />
                            </svg>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default KnockOut;
