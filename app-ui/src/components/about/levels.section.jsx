import { useId } from 'react';

import LevelBadge from '../players/level.badge';
import { FlightPicture } from '../flights/flight.art';
import { BarrelPicture } from '../flights/barrel.art';
import { AVERAGE_LEVELS } from '../../utils/average.levels';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

const KINDS = { shape: 'flight shape', design: 'flight design', barrel: 'barrel' };

// the flights and barrels a level unlocks, small, each with its name
const Unlocks = ({ items }) => {
    const uid = `unlocks-${useId().replace(/:/g, '')}`;
    if (!items.length) return null;
    return (
        <ul className="about-unlocks list-unstyled m-0">
            {items.map(item => (
                <li key={`${item.kind}-${item.id}`} title={`${item.label}: ${KINDS[item.kind]}, ${item.cost} flight points`}>
                    {item.kind === 'barrel'
                        ? <BarrelPicture barrel={item.id} uid={`${uid}-${item.kind}-${item.id}`} />
                        : <FlightPicture shape={item.kind === 'shape' ? item.id : 'standard'} design={item.kind === 'design' ? item.id : 'plain'} color="#7d8791" uid={`${uid}-${item.kind}-${item.id}`} />}
                    <span>{item.label}</span>
                </li>
            ))}
        </ul>
    );
};

/**
 * The two kinds of levels: the player level from XP (from the badge
 * catalogue of the server, so the numbers are the ones it counts with) and
 * the level of the 3-dart average, each with the flights and barrels it
 * opens; and how the flight points to unlock them are earned.
 */
const LevelsSection = ({ levels, rules, flights }) => {
    const items = flights?.items ?? [];
    // what a level alone opens, what an average alone opens, and what needs both
    const byLevel = (index) => items.filter(item => item.level === index && !item.average);
    const byAverage = (min) => items.filter(item => item.average === min && !item.level);
    const both = items.filter(item => item.level && item.average);
    const legendary = items.filter(item => item.feat);
    return (
    <div className="d-flex flex-column gap-4 p-2">
        <section className="d-flex flex-column gap-3">
            <h2 className="game-setup-section-title m-0">Player levels</h2>
            <p className="text-subtle fs-7 m-0">
                Every player collects XP for playing, winning, badges and skill. From League Player on a level also needs a minimum X01 average,
                so it stands for how someone plays and not only for how much. The level follows the current statistics, so it shows today&apos;s form
                and can go down again. Each profile shows the level, the way to the next one and what its XP are made of.
            </p>
            {!levels && <span className="text-faint fs-7">Loading levels…</span>}
            {levels &&
                <ol className="list-unstyled m-0 about-levels">
                    {levels.map((level, index) => (
                        <li key={level.id} className="about-level-row">
                            <div className="about-level-head">
                                <LevelBadge level={{ ...level, index: index + 1 }} />
                                <span className="text-subtle fs-8 text-end">
                                    {formatNumber(level.xp)} XP
                                    {level.minAverage && ` · X01 average ${level.minAverage}`}
                                    {level.minGames && ` · ${level.minGames} games`}
                                </span>
                            </div>
                            <Unlocks items={byLevel(index + 1)} />
                        </li>
                    ))}
                </ol>
            }
            {rules &&
                <div className="about-xp">
                    <h3 className="fs-7 fw-semibold text-default mb-2">How XP are earned</h3>
                    <ul className="text-subtle fs-7 m-0 ps-4 d-flex flex-column gap-1">
                        <li>{rules.perGame} XP for every game played and {rules.perWin} more for every win</li>
                        <li>{rules.perBadge} XP for every badge, {rules.per180} for every 180</li>
                        <li>{rules.perAveragePoint} XP per point of X01 average and {rules.perCheckoutPercent} per percent of checkout rate, once {rules.minX01Games} X01 games are played</li>
                        <li>{rules.perMarkPerRound} XP per Cricket mark per round, once {rules.minCricketGames} Cricket games are played</li>
                    </ul>
                </div>
            }
        </section>

        <section className="d-flex flex-column gap-3">
            <h2 className="game-setup-section-title m-0">Average levels</h2>
            <p className="text-subtle fs-7 m-0">
                The 3-dart average of X01 has a level of its own, on the same steps as the averages the player levels need. The profile names the level
                of a player&apos;s average, and the average over time marks every change of level, up and down, with lines for the level reached and the next one.
            </p>
            <ol className="list-unstyled m-0 about-levels">
                {AVERAGE_LEVELS.map((level, index) => {
                    const Icon = level.icon;
                    const next = AVERAGE_LEVELS[index + 1];
                    return (
                        <li key={level.name} className="about-level-row">
                            <div className="about-level-head">
                                <span className="level-badge level-badge-sm" style={{ '--level-color': level.color }}>
                                    <span className="level-badge-icon" aria-hidden="true"><Icon /></span>
                                    <span className="level-badge-name">{level.name}</span>
                                </span>
                                <span className="text-subtle fs-8 text-end">
                                    {level.min === 0 ? `average below ${next.min}` : `average from ${level.min}`}
                                </span>
                            </div>
                            <Unlocks items={byAverage(level.min)} />
                        </li>
                    );
                })}
            </ol>
            {both.length > 0 && (
                <div className="d-flex flex-column gap-2">
                    <span className="text-subtle fs-7">Some need a player level and an average together:</span>
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {[...new Set([...both].sort((a, b) => a.level - b.level || a.average - b.average).map(item => `${item.level}|${item.average}`))].map(key => {
                            const [level, average] = key.split('|').map(Number);
                            return (
                                <li key={key} className="about-level-row">
                                    <span className="text-default fs-7 fw-semibold">{levels?.[level - 1]?.name ?? `Level ${level}`} and an average of {average}</span>
                                    <Unlocks items={both.filter(item => item.level === level && item.average === average)} />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>

        {flights && (
            <section className="d-flex flex-column gap-3">
                <h2 className="game-setup-section-title m-0">Flight points</h2>
                <p className="text-subtle fs-7 m-0">
                    Every player collects flight points by playing and training, and spends them on the flight shapes, designs and barrels they like, on their
                    player profile. Besides the starters, a flight costs from 60 to 650 points; many also need a player level or an average level, shown above
                    with the level they belong to. The points are worked out from the games and trainings, so a deleted game takes its points along.
                </p>
                <div className="about-xp">
                    <h3 className="fs-7 fw-semibold text-default mb-2">How flight points are earned</h3>
                    <ul className="text-subtle fs-7 m-0 ps-4 d-flex flex-column gap-1">
                        {flights.pointRules.map(rule => <li key={rule.id}>{rule.label}: {rule.per} each</li>)}
                    </ul>
                </div>
                {legendary.length > 0 && (
                    <div className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-7">The legendary ones cannot be bought; they come with a feat:</span>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {legendary.map(item => (
                                <li key={`${item.kind}-${item.id}`} className="about-level-row">
                                    <span className="text-default fs-7 fw-semibold">{item.feat}</span>
                                    <Unlocks items={[item]} />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        )}
    </div>
    );
};

export default LevelsSection;
