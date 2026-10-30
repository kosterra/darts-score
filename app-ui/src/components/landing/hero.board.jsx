import { useEffect, useRef, useState } from 'react';

import DartBoard from '../games/common/dartboard';
import { t } from '../../utils/i18n';

// the three darts of the loop: all in the treble 20, left, middle and right of it (the board's coordinates)
const THROW = [{ x: 202, y: 114.4 }, { x: 211.2, y: 121 }, { x: 219.8, y: 108.1 }].map(point => ({ ...point, dart: 'T20' }));
// Legmate green flights (the green of the flight colours a player can choose)
const FLIGHT = { color: '#46a758', shape: 'standard', design: 'plain', barrel: 'classic' };
// the loop: a dart every so often, the 180 held a while, a breath, then again
const DART_MS = 950;
const HOLD_MS = 3200;
const REST_MS = 900;
// a visitor who throws: the loop waits until they have stopped
const VISITOR_REST_MS = 5000;

const scoreOf = (field) => {
    if (!field || field === '0') return 0;
    if (field === 'D25') return 50;
    if (field === 'S25') return 25;
    return Number(field.slice(1)) * ({ S: 1, D: 2, T: 3 }[field[0]] ?? 0);
};

// a field as players say it
const wordOf = (field) => field === 'D25' ? 'Bull' : field === 'S25' ? '25' : field === '0' ? '–' : field;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The small dartboard of the start page: three darts fly into the treble 20,
 * 180, again and again. A visitor can throw at it themselves, a tap for each
 * dart, with the score under it; onMoment('bull') when they hit the
 * bullseye, onMoment('180') when their three darts make 180. With reduced
 * motion the three darts sit in the board.
 */
const HeroBoard = ({ onMoment }) => {
    const still = reducedMotion();
    const [darts, setDarts] = useState(still ? THROW : []);
    // the visitor throws: the loop stops until they are done
    const [mine, setMine] = useState(false);
    const [round, setRound] = useState(0);
    const restTimer = useRef(null);

    useEffect(() => {
        if (mine || still) return undefined;
        setDarts([]);
        const timers = [1, 2, 3].map(count => setTimeout(() => setDarts(THROW.slice(0, count)), DART_MS * count));
        timers.push(setTimeout(() => setDarts([]), DART_MS * 3 + HOLD_MS));
        timers.push(setTimeout(() => setRound(current => current + 1), DART_MS * 3 + HOLD_MS + REST_MS));
        return () => timers.forEach(clearTimeout);
    }, [mine, still, round]);

    useEffect(() => () => clearTimeout(restTimer.current), []);

    const throwAt = (field, point) => {
        if (!point) return;
        const dart = { ...point, dart: field };
        setDarts(current => {
            const own = mine && current.length < 3 ? [...current, dart] : [dart];
            if (own.length === 3 && own.reduce((sum, entry) => sum + scoreOf(entry.dart), 0) === 180) onMoment?.('180');
            return own;
        });
        setMine(true);
        clearTimeout(restTimer.current);
        restTimer.current = setTimeout(() => setMine(false), VISITOR_REST_MS);
        if (field === 'D25') onMoment?.('bull');
    };

    const total = darts.reduce((sum, entry) => sum + scoreOf(entry.dart), 0);

    return (
        <div className="landing-board" role="group" aria-label={t('A dartboard to try: tap a field to throw')}>
            <DartBoard handleClick={throwAt} markers={darts} withDarts flight={FLIGHT} />
            <div className={`landing-board-score ${total === 180 ? 'is-180' : ''}`}>
                {[0, 1, 2].map(index => (
                    <span key={index} className={`landing-board-dart ${darts[index] ? 'is-in' : ''}`}>{darts[index] ? wordOf(darts[index].dart) : '·'}</span>
                ))}
                <span className="landing-board-total">{darts.length ? total : ''}</span>
            </div>
        </div>
    );
};

export default HeroBoard;
