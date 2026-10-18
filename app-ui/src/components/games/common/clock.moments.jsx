import { Stage } from './x01.moments';
import { Dragon, Gnome, Monster, Troll } from './one.eighty.figures';
import { targetLabel } from '../../../utils/atc.darts';

const FIGURES = [Gnome, Monster, Dragon, Troll];

// a wall clock: a cream face with the hours, two hands and two bells on top
const WallClock = ({ ringing = false, className = '' }) => (
    <svg viewBox="0 0 200 220" className={`clock-face ${ringing ? 'is-ringing' : ''} ${className}`}>
        <g className="clock-bells">
            <path d="M38 40 A26 26 0 0 1 84 22 Z" fill="#c8413a" />
            <path d="M116 22 A26 26 0 0 1 162 40 Z" fill="#c8413a" />
            <rect x="96" y="8" width="8" height="18" rx="3" fill="#8f979f" />
        </g>
        <circle cx="100" cy="120" r="92" fill="#8f979f" />
        <circle cx="100" cy="120" r="84" fill="#f6f2e8" />
        {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * 30 - 90) * Math.PI / 180;
            return (
                <text key={index} x={100 + 66 * Math.cos(angle)} y={120 + 66 * Math.sin(angle) + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill="#2b2622">
                    {index === 0 ? 12 : index}
                </text>
            );
        })}
        <line className="clock-hand-hour" x1="100" y1="120" x2="100" y2="76" stroke="#2b2622" strokeWidth="7" strokeLinecap="round" />
        <line className="clock-hand-minute" x1="100" y1="120" x2="100" y2="52" stroke="#2b2622" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="100" cy="120" r="7" fill="#c8413a" />
    </svg>
);

/**
 * The big moments of Around the Clock, over the game without catching a click:
 * the clock strikes twelve for whoever finishes the round, three targets in
 * one visit are "On a roll!", and a treble that jumps three numbers ahead is
 * a "Giant leap!". moment: { key, kind, name, playerIndex, from, to, darts }
 */
const ClockMoment = ({ moment, onDone, mode }) => {
    if (!moment) return <Stage moment={null} onDone={onDone} />;
    const label = (index) => targetLabel(index, mode);

    if (moment.kind === 'strike') {
        return (
            <Stage moment={moment} onDone={onDone} className="is-clock-strike" title="Round the clock!" detail={<><strong>{moment.name}</strong> is done in {moment.darts} darts</>}>
                <div className="clock-strike">
                    <span className="clock-ring" /><span className="clock-ring is-late" />
                    <WallClock ringing />
                </div>
            </Stage>
        );
    }

    if (moment.kind === 'roll') {
        const hits = Array.from({ length: moment.to - moment.from }, (_, index) => label(moment.from + index));
        return (
            <Stage moment={moment} onDone={onDone} className="is-clock-roll" title="On a roll!" detail={<><strong>{moment.name}</strong> hits {hits.join(' · ')}</>}>
                <div className="clock-roll">
                    <WallClock className="is-ticking" />
                </div>
            </Stage>
        );
    }

    // the giant leap: the figure jumps over the numbers it skipped
    const Figure = FIGURES[(moment.playerIndex ?? 0) % FIGURES.length];
    const tiles = Array.from({ length: moment.to - moment.from + 1 }, (_, index) => moment.from + index);
    return (
        <Stage moment={moment} onDone={onDone} className="is-clock-leap" title="Giant leap!" detail={<><strong>{moment.name}</strong> jumps from {label(moment.from)} to {label(moment.to)}</>}>
            <div className="clock-leap">
                <div className="clock-leap-tiles">
                    {tiles.map((index, place) => (
                        <span key={index} className={`clock-leap-tile ${place === tiles.length - 1 ? 'is-landing' : ''}`}>{label(index)}</span>
                    ))}
                </div>
                <div className="clock-leap-jumper">
                    <svg viewBox="0 0 120 170" className="clock-leap-figure"><Figure sign={false} /></svg>
                </div>
            </div>
        </Stage>
    );
};

export default ClockMoment;
