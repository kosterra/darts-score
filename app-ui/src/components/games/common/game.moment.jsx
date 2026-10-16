import { GiDart } from 'react-icons/gi';

import Confetti from '../../badges/confetti';
import useFleeting from './use.fleeting';

const DURATION_MS = { leg: 3400, set: 4200 };

/**
 * A broadcast-style banner when a player wins a leg or a set, with the
 * standing and who throws first next. Like the 180 it never catches a click
 * or a key and makes room as soon as the next player gets going.
 * "moment" is { key, kind: 'leg' | 'set', winner, title, standings: [{ name, value }], next, starter }.
 */
const GameMoment = ({ moment, onDone }) => {
    const leaving = useFleeting(moment, onDone, moment ? DURATION_MS[moment.kind] : 0);

    if (!moment) return null;
    const isSet = moment.kind === 'set';

    return (
        <div key={moment.key} className={`game-moment game-moment-${moment.kind} ${leaving ? 'game-moment-leaving' : ''}`} aria-live="polite">
            <span className="visually-hidden">
                {moment.winner} {moment.title}. {moment.next}: {moment.starter} throws first.
            </span>
            {isSet && <Confetti />}
            <div className="game-moment-band" aria-hidden="true">
                <div className="game-moment-band-inner">
                    <span className="game-moment-chip">{isSet ? 'Set won' : 'Leg won'}</span>
                    <div className="game-moment-headline">
                        <span className="game-moment-winner">{moment.winner}</span>
                        <span className="game-moment-title">{moment.title}</span>
                    </div>
                    <div className="game-moment-standings">
                        {moment.standings.map(standing => (
                            <span key={standing.name} className={standing.name === moment.winner ? 'is-winner' : ''}>
                                <span className="game-moment-standing-value">{standing.value}</span>
                                <span className="game-moment-standing-name">{standing.name}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <div className="game-moment-next" aria-hidden="true">
                <GiDart className="game-moment-dart" />
                <span className="game-moment-next-label">{moment.next}</span>
                <span className="game-moment-starter">{moment.starter}</span>
                <span className="game-moment-next-label">throws first</span>
            </div>
        </div>
    );
};

export default GameMoment;
