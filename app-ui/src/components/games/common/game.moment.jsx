import { useEffect, useState } from 'react';
import { GiDart } from 'react-icons/gi';

// how long the card stays, and how long it takes to leave
const DURATION_MS = { leg: 8000, set: 10000 };
const LEAVE_MS = 300;

/**
 * A card when a player wins a leg or a set (bottom right, on a phone at the
 * top): the standing and who throws first next. It covers neither the board
 * nor the input, so the game goes on at once; it stays a few seconds or until
 * it is closed.
 * "moment" is { key, kind: 'leg' | 'set', winner, title, standings: [{ name, value }], next, starter }.
 */
const GameMoment = ({ moment, onDone }) => {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!moment) return undefined;
        setLeaving(false);
        const leave = setTimeout(() => setLeaving(true), DURATION_MS[moment.kind] ?? DURATION_MS.leg);
        return () => clearTimeout(leave);
    }, [moment]);

    useEffect(() => {
        if (!leaving) return undefined;
        const done = setTimeout(onDone, LEAVE_MS);
        return () => clearTimeout(done);
    }, [leaving, onDone]);

    if (!moment) return null;
    const isSet = moment.kind === 'set';

    return (
        <div className="game-moment-dock">
            <div key={moment.key} className={`game-moment-card is-${moment.kind} ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite">
                <div className="game-moment-top">
                    <span className="game-moment-tag">{isSet ? 'Set won' : 'Leg won'}</span>
                    <button type="button" className="game-moment-close" aria-label="Close" onClick={() => setLeaving(true)}>
                        <i className="pi pi-times" aria-hidden="true" />
                    </button>
                </div>
                <div className="game-moment-headline">
                    <span className="game-moment-winner">{moment.winner}</span> {moment.title}
                </div>
                <div className="game-moment-standings">
                    {moment.standings.map((standing, index) => (
                        <span key={standing.name} className={standing.name === moment.winner ? 'is-winner' : ''}>
                            {index > 0 && <span className="game-moment-dash" aria-hidden="true">–</span>}
                            <span className="game-moment-value">{standing.value}</span>
                            <span className="game-moment-name">{standing.name}</span>
                        </span>
                    ))}
                    <span className="game-moment-unit">{isSet ? 'sets' : 'legs'}</span>
                </div>
                <div className="game-moment-next">
                    <GiDart aria-hidden="true" />
                    <span>Next: {moment.next} · <strong>{moment.starter}</strong> throws first</span>
                </div>
            </div>
        </div>
    );
};

export default GameMoment;
