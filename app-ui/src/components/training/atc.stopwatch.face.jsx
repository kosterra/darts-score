import { t } from '../../utils/i18n';

// a real stopwatch: a cream dial with the seconds round the edge, a sweeping
// red second hand, a small dial for the minutes, and a gold mark at the best time

const CENTRE = 100;
const polar = (radius, turn) => {
    const angle = (turn * 360 - 90) * Math.PI / 180;
    return [CENTRE + radius * Math.cos(angle), CENTRE + radius * Math.sin(angle)];
};

/**
 * elapsedMs: the time on the watch; best: the personal best in hundredths
 * (or none); pace: 'ahead' or 'behind' while running against it.
 */
const ATCStopwatchFace = ({ elapsedMs, best, pace }) => {
    const seconds = elapsedMs / 1000;
    // the hands turn smoothly: a full turn a minute, the small one a turn in 30 minutes
    const secondTurn = (seconds % 60) / 60;
    const minuteTurn = (seconds / 60 % 30) / 30;
    const bestTurn = best ? (best / 100 % 60) / 60 : null;
    const [subX, subY] = [CENTRE, 132];

    return (
        <svg viewBox="0 0 200 222" className={`atc-watch ${pace ? `is-${pace}` : ''}`} aria-hidden="true">
            {/* the crown and the buttons on top */}
            <rect x="90" y="0" width="20" height="12" rx="3" fill="#b8bec6" />
            <rect x="94" y="10" width="12" height="10" fill="#8f979f" />
            <rect x="40" y="22" width="14" height="10" rx="2" transform="rotate(-40 47 27)" fill="#8f979f" />
            <rect x="146" y="22" width="14" height="10" rx="2" transform="rotate(40 153 27)" fill="#8f979f" />
            <g transform="translate(0 22)">
                {/* the case and the glow of the pace */}
                <circle cx={CENTRE} cy={CENTRE} r="98" className="atc-watch-pace" />
                <circle cx={CENTRE} cy={CENTRE} r="94" fill="url(#atc-watch-case)" />
                <circle cx={CENTRE} cy={CENTRE} r="86" fill="#f6f2e8" />
                <defs>
                    <linearGradient id="atc-watch-case" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#dfe3e8" />
                        <stop offset="0.5" stopColor="#9aa2ab" />
                        <stop offset="1" stopColor="#5d656e" />
                    </linearGradient>
                </defs>
                {/* the seconds round the edge */}
                {Array.from({ length: 60 }, (_, index) => {
                    const long = index % 5 === 0;
                    const [x1, y1] = polar(long ? 72 : 77, index / 60);
                    const [x2, y2] = polar(83, index / 60);
                    return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2b2622" strokeWidth={long ? 2.4 : 1} strokeLinecap="round" />;
                })}
                {Array.from({ length: 12 }, (_, index) => {
                    const [x, y] = polar(61, index / 12);
                    return <text key={index} x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2b2622">{index === 0 ? 60 : index * 5}</text>;
                })}
                {/* the best time as a gold mark on the edge */}
                {bestTurn !== null && (() => {
                    const [x, y] = polar(88, bestTurn);
                    return <circle cx={x} cy={y} r="4.5" fill="#e9ac2f" stroke="#7a5a12" strokeWidth="1" />;
                })()}
                {/* the minutes on the small dial */}
                <circle cx={subX} cy={subY} r="17" fill="#ece6d6" stroke="#cfc6b2" strokeWidth="1" />
                {Array.from({ length: 6 }, (_, index) => {
                    const angle = (index / 6 * 360 - 90) * Math.PI / 180;
                    return <line key={index} x1={subX + 12 * Math.cos(angle)} y1={subY + 12 * Math.sin(angle)} x2={subX + 15 * Math.cos(angle)} y2={subY + 15 * Math.sin(angle)} stroke="#2b2622" strokeWidth="1.2" />;
                })}
                <line x1={subX} y1={subY} x2={subX} y2={subY - 13} stroke="#2b2622" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteTurn * 360} ${subX} ${subY})`} />
                <text x={CENTRE} y="80" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.5" fill="#8a8172">{t('OCHE')}</text>
                {/* the second hand, with its tail */}
                <g transform={`rotate(${secondTurn * 360} ${CENTRE} ${CENTRE})`}>
                    <line x1={CENTRE} y1={CENTRE + 16} x2={CENTRE} y2={CENTRE - 80} stroke="#c8413a" strokeWidth="2" strokeLinecap="round" />
                    <circle cx={CENTRE} cy={CENTRE + 12} r="3.5" fill="#c8413a" />
                </g>
                <circle cx={CENTRE} cy={CENTRE} r="5" fill="#c8413a" />
                <circle cx={CENTRE} cy={CENTRE} r="2" fill="#f6f2e8" />
            </g>
        </svg>
    );
};

export default ATCStopwatchFace;
