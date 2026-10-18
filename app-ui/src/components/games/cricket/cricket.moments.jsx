import { Dragon, Gnome, Monster, Troll } from '../common/one.eighty.figures';
import useFleeting from '../common/use.fleeting';

const DURATION_MS = 4200;
const FIGURES = [Gnome, Monster, Dragon, Troll];
// where the top of each figure's head is in its 120 × 170 box, for the hat
const HEAD_TOP = [4, 18, 22, 20];

/**
 * A top hat lands on the player's figure, which lifts it in greeting: the
 * hat trick of Cricket, three bulls in one visit. "moment" is
 * { key, name, playerIndex, darts }.
 */
export const HatTrick = ({ moment, onDone }) => {
    const leaving = useFleeting(moment, onDone, DURATION_MS);
    if (!moment) return null;
    const index = moment.playerIndex % FIGURES.length;
    const Figure = FIGURES[index];
    const top = HEAD_TOP[index];

    return (
        <div key={moment.key} className={`cricket-moment ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="cricket-moment-banner is-high">
                <span className="cricket-moment-title">Hat Trick!</span>
                <span className="cricket-moment-detail"><strong>{moment.name}</strong> · {moment.darts.join(' · ')}</span>
            </p>
            <div className="hat-trick-stage" aria-hidden="true">
                <svg viewBox="0 0 120 170" className="hat-trick-figure">
                    <Figure sign={false} />
                    <g className="hat-trick-hat" style={{ '--head': `${top}px` }}>
                        <g transform={`translate(0 ${top - 34})`}>
                            <ellipse cx="60" cy="32" rx="30" ry="6" fill="#1b1714" />
                            <rect x="42" y="2" width="36" height="30" rx="3" fill="#24201c" />
                            <rect x="42" y="22" width="36" height="6" fill="#e9ac2f" />
                            <ellipse cx="60" cy="2" rx="18" ry="3.5" fill="#34302b" />
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
};

/**
 * The player's figure sweeps the board clean with a broom: they closed all
 * seven numbers while an opponent has not closed a single one. "moment" is
 * { key, name, playerIndex, victims }.
 */
export const ShutOut = ({ moment, onDone }) => {
    const leaving = useFleeting(moment, onDone, DURATION_MS);
    if (!moment) return null;
    const Figure = FIGURES[moment.playerIndex % FIGURES.length];

    return (
        <div key={moment.key} className={`cricket-moment ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="cricket-moment-banner">
                <span className="cricket-moment-title">Shut-out!</span>
                <span className="cricket-moment-detail">
                    <strong>{moment.name}</strong> closed all seven, {moment.victims.join(' and ')} not a single one
                </span>
            </p>
            <div className="shut-out-run" aria-hidden="true">
                <span className="shut-out-dust" /><span className="shut-out-dust" /><span className="shut-out-dust" />
                <svg viewBox="0 0 200 170" className="shut-out-figure">
                    {/* the broom, sweeping ahead of the figure */}
                    <g className="shut-out-broom">
                        <path d="M100 108 L174 156" stroke="#8a5f2e" strokeWidth="6" strokeLinecap="round" />
                        <path d="M164 148 L196 160 L188 172 L150 168 Z" fill="#d9b45a" />
                        <path d="M160 152 L194 162" stroke="#b08a3a" strokeWidth="3" />
                    </g>
                    <g transform="translate(0 0)">
                        <Figure sign={false} />
                    </g>
                </svg>
            </div>
        </div>
    );
};
