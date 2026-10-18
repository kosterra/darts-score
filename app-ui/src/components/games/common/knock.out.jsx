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

/**
 * When a player lands on an opponent's score in Elimination: a figure walks
 * up to the opponent's house, kicks them out, and they fly back home to 0.
 * Like the 180 it lies over the game without catching a click: the next
 * player throws on, and a click, tap or key lets it fade.
 *
 * knockOut: { key, by, byIndex, victim, victimIndex, score, others }
 */
const KnockOut = ({ knockOut, onDone }) => {
    const leaving = useFleeting(knockOut, onDone, DURATION_MS);
    if (!knockOut) return null;

    const Attacker = FIGURES[knockOut.byIndex % FIGURES.length];
    // never the same figure twice in one scene
    const victimFigure = knockOut.victimIndex % FIGURES.length === knockOut.byIndex % FIGURES.length ? knockOut.victimIndex + 1 : knockOut.victimIndex;
    const Victim = FIGURES[victimFigure % FIGURES.length];
    const others = knockOut.others ?? 0;

    return (
        <div key={knockOut.key} className={`knock-out ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="knock-banner">
                <strong>{knockOut.by}</strong> sends <strong>{knockOut.victim}</strong>{others > 0 ? ` and ${others} more` : ''} back to 0!
            </p>
            <div className="knock-scene" aria-hidden="true">
                <Home />
                <House name={knockOut.victim} score={knockOut.score} />
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
        </div>
    );
};

export default KnockOut;
