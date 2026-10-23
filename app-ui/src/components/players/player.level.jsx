import { useState } from 'react';
import { ProgressBar } from 'primereact/progressbar';

import LevelBadge from './level.badge';
import { LEVEL_STYLES } from '../../utils/levels';
import { locale, t } from '../../utils/i18n';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

// what is missing for the next level, the XP with a thousands separator like the rest
const missingText = (entry, level) => entry.id === 'xp' ? t('{{formatNumber}} more XP', { formatNumber: formatNumber(level.next.xp - level.xp) }) : entry.label;

// what a level needs besides XP, in words
const needsOf = (entry) => [
    entry.minAverage && t('X01 average {{minAverage}}', { minAverage: entry.minAverage }),
    entry.minGames && t('{{minGames}} games', { minGames: entry.minGames }),
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
                    {formatNumber(level.xp)}{' '}{t('XP ·')}{' '}{level.next ? <>{t('next:')}{' '}<span className="text-default">{level.next.name}</span></> : t('the highest level')}
                </span>
                {level.next?.missing.length > 0 &&
                    <span className="text-faint fs-8">{t('needs')}{' '}{level.next.missing.map(entry => missingText(entry, level)).join(` ${t('and')} `)}</span>
                }
            </div>
            <button type="button" className="level-help" aria-expanded={open} onClick={() => setOpen(!open)}><i className={`pi ${open ? 'pi-chevron-up' : 'pi-info-circle'} me-1`} aria-hidden="true" />{t('How levels work')}</button>

            {/* opens in place, below the level */}
            {open &&
                <div className="level-details d-flex flex-column gap-4 w-100">
                    <p className="text-subtle m-0">
                        {t('Players collect XP for every game, win and badge, and for their skill. From League Player on a level also needs a minimum X01 average. The level follows the current statistics, so it shows the form of today.')}
                    </p>
                    <section>
                        <h3 className="fs-6 fw-semibold text-default mb-2">{t('XP of this player')}</h3>
                        <table className="w-100 level-breakdown">
                            <tbody>
                                {level.breakdown.map(entry => (
                                    <tr key={entry.id} className={entry.counts === false ? 'text-faint' : ''}>
                                        <td>{entry.label}</td>
                                        <td className="text-end">{entry.id === 'checkout' ? `${entry.value} %` : formatNumber(entry.value)}</td>
                                        <td className="text-end fw-semibold">{entry.counts === false ? t('after a few games') : t('{{formatNumber}} XP', { formatNumber: formatNumber(entry.xp) })}</td>
                                    </tr>
                                ))}
                                <tr className="level-breakdown-total">
                                    <td colSpan={2}>{t('Total')}</td>
                                    <td className="text-end fw-semibold">{formatNumber(level.xp)}{' '}{t('XP')}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-faint fs-8 mt-2 mb-0">
                            {level.rules.perGame}{' '}{t('XP per game,')}{' '}{level.rules.perWin}{' '}{t('per win,')}{' '}{level.rules.perBadge}{' '}{t('per badge,')}
                            {' '}{level.rules.per180}{' '}{t('per 180,')}
                            {' '}{level.rules.perAveragePoint}{' '}{t('per point of X01 average and')}{' '}{level.rules.perCheckoutPercent}{' '}{t('per percent of checkout rate (from')}{' '}{level.rules.minX01Games}{' '}{t('X01 games),')}{' '}{level.rules.perMarkPerRound}{' '}{t('per Cricket mark per round (from')}{' '}{level.rules.minCricketGames}{' '}{t('Cricket games).')}
                        </p>
                    </section>
                    <section>
                        <h3 className="fs-6 fw-semibold text-default mb-2">{t('The levels')}</h3>
                        <ol className="list-unstyled m-0 d-flex flex-column gap-2">
                            {level.ladder.map((entry, index) => (
                                <li key={entry.id} className={`level-ladder-row ${index === current ? 'is-current' : ''} ${index > current ? 'is-ahead' : ''}`}>
                                    <LevelBadge level={{ ...entry, index: index + 1 }} />
                                    <span className="text-subtle fs-8 ms-auto text-end">
                                        {formatNumber(entry.xp)}{' '}{t('XP')}{needsOf(entry) && ` · ${needsOf(entry)}`}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            }
        </div>
    );
};

export default PlayerLevel;
