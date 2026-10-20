import LevelBadge from '../players/level.badge';
import { AVERAGE_LEVELS } from '../../utils/average.levels';

const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);

/**
 * The two kinds of levels: the player level from XP (from the badge
 * catalogue of the server, so the numbers are the ones it counts with) and
 * the level of the 3-dart average.
 */
const LevelsSection = ({ levels, rules }) => (
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
                            <LevelBadge level={{ ...level, index: index + 1 }} />
                            <span className="text-subtle fs-8 text-end">
                                {formatNumber(level.xp)} XP
                                {level.minAverage && ` · X01 average ${level.minAverage}`}
                                {level.minGames && ` · ${level.minGames} games`}
                            </span>
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
                            <span className="level-badge level-badge-sm" style={{ '--level-color': level.color }}>
                                <span className="level-badge-icon" aria-hidden="true"><Icon /></span>
                                <span className="level-badge-name">{level.name}</span>
                            </span>
                            <span className="text-subtle fs-8 text-end">
                                {level.min === 0 ? `average below ${next.min}` : `average from ${level.min}`}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    </div>
);

export default LevelsSection;
