import { Dragon, Gnome, Monster, Troll } from '../common/one.eighty.figures';
import useFleeting from '../common/use.fleeting';
import HatFigure from '../common/hat.figure';
import { t } from '../../../utils/i18n';

const DURATION_MS = 4200;
const FIGURES = [Gnome, Monster, Dragon, Troll];

/**
 * A top hat lands on the player's figure, which lifts it in greeting: the
 * hat trick of Cricket, three bulls in one visit. "moment" is
 * { key, name, playerIndex, darts }.
 */
export const HatTrick = ({ moment, onDone }) => {
    const leaving = useFleeting(moment, onDone, DURATION_MS);
    if (!moment) return null;

    return (
        <div key={moment.key} className={`stage-moment ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="stage-moment-banner is-high">
                <span className="stage-moment-title">{t('Hat Trick!')}</span>
                <span className="stage-moment-detail"><strong>{moment.name}</strong> · {moment.darts.join(' · ')}</span>
            </p>
            <div className="hat-trick-stage" aria-hidden="true">
                <HatFigure playerIndex={moment.playerIndex} landing />
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
        <div key={moment.key} className={`stage-moment ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
            <p className="stage-moment-banner">
                <span className="stage-moment-title">{t('Shut-out!')}</span>
                <span className="stage-moment-detail">
                    <strong>{moment.name}</strong>{' '}{t('closed all seven,')}{' '}{moment.victims.join(' and ')}{' '}{t('not a single one')}
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
