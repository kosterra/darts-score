import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { ProgressBar } from 'primereact/progressbar';

import LevelBadge from './level.badge';
import { LEVEL_STYLES } from '../../utils/levels';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

// what is missing for the next level, the XP with a thousands separator like the rest
const missingText = (entry, level) => entry.id === 'xp' ? `${formatNumber(level.next.xp - level.xp)} more XP` : entry.label;

// what a level needs besides XP, in words
const needsOf = (entry) => [
    entry.minAverage && `X01 average ${entry.minAverage}`,
    entry.minGames && `${entry.minGames} games`,
].filter(Boolean).join(', ');

/**
 * A player's level on their profile: the badge, the way to the next level,
 * and how the level comes about.
 */
const PlayerLevel = ({ level }) => {
    const [open, setOpen] = useState(false);
    if (!level) return null;
    const current = level.level.index - 1;

    return (
        <div className="player-level d-flex flex-wrap align-items-center column-gap-3 row-gap-2">
            <LevelBadge level={level.level} size="md" />
            <div className="d-flex flex-column gap-1" style={{ minWidth: '14rem', flex: '0 1 24rem' }}>
                <ProgressBar
                    value={level.progress}
                    showValue={false}
                    className="level-progress"
                    style={{ '--level-color': (LEVEL_STYLES[level.next?.id] ?? LEVEL_STYLES[level.level.id]).color }}
                />
                {/* two lines on purpose: where the player is, then what the next level needs */}
                <span className="text-subtle fs-8">
                    {formatNumber(level.xp)} XP · {level.next ? <>next: <span className="text-default">{level.next.name}</span></> : 'the highest level'}
                </span>
                {level.next?.missing.length > 0 &&
                    <span className="text-faint fs-8">needs {level.next.missing.map(entry => missingText(entry, level)).join(' and ')}</span>
                }
            </div>
            <button type="button" className="level-help" onClick={() => setOpen(true)}><i className="pi pi-info-circle me-1" aria-hidden="true" />How levels work</button>

            <Dialog header="Player levels" visible={open} onHide={() => setOpen(false)} blockScroll draggable={false} className="m-4" style={{ width: '40rem', maxWidth: '100%' }}>
                <div className="d-flex flex-column gap-4">
                    <p className="text-subtle m-0">
                        Players collect XP for every game, win and badge, and for their skill. From League Player on a level
                        also needs a minimum X01 average. The level follows the current statistics, so it shows the form of today.
                    </p>
                    <section>
                        <h3 className="fs-6 fw-semibold text-default mb-2">XP of this player</h3>
                        <table className="w-100 level-breakdown">
                            <tbody>
                                {level.breakdown.map(entry => (
                                    <tr key={entry.id} className={entry.counts === false ? 'text-faint' : ''}>
                                        <td>{entry.label}</td>
                                        <td className="text-end">{entry.id === 'checkout' ? `${entry.value} %` : formatNumber(entry.value)}</td>
                                        <td className="text-end fw-semibold">{entry.counts === false ? 'after a few games' : `${formatNumber(entry.xp)} XP`}</td>
                                    </tr>
                                ))}
                                <tr className="level-breakdown-total">
                                    <td colSpan={2}>Total</td>
                                    <td className="text-end fw-semibold">{formatNumber(level.xp)} XP</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-faint fs-8 mt-2 mb-0">
                            {level.rules.perGame} XP per game, {level.rules.perWin} per win, {level.rules.perBadge} per badge,
                            {' '}{level.rules.per180} per 180,
                            {' '}{level.rules.perAveragePoint} per point of X01 average and {level.rules.perCheckoutPercent} per percent of
                            checkout rate (from {level.rules.minX01Games} X01 games), {level.rules.perMarkPerRound} per Cricket mark per round
                            (from {level.rules.minCricketGames} Cricket games).
                        </p>
                    </section>
                    <section>
                        <h3 className="fs-6 fw-semibold text-default mb-2">The levels</h3>
                        <ol className="list-unstyled m-0 d-flex flex-column gap-2">
                            {level.ladder.map((entry, index) => (
                                <li key={entry.id} className={`level-ladder-row ${index === current ? 'is-current' : ''} ${index > current ? 'is-ahead' : ''}`}>
                                    <LevelBadge level={{ ...entry, index: index + 1 }} />
                                    <span className="text-subtle fs-8 ms-auto text-end">
                                        {formatNumber(entry.xp)} XP{needsOf(entry) && ` · ${needsOf(entry)}`}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            </Dialog>
        </div>
    );
};

export default PlayerLevel;
