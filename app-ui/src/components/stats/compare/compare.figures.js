import { GAME_TITLES } from '../../../utils/club.rules.labels';
import { TRAININGS } from '../../../rules/trainings';
import { t } from '../../../utils/i18n';

/**
 * What the comparison shows of each game and of each player: the rows for
 * SideBySide, from the answers of the API.
 */

const fixed = (decimals) => (value) => (value == null ? '–' : Number(value).toFixed(decimals));
const percent = (value) => (value == null ? '–' : `${value} %`);
const percentLead = (difference) => `${Number(difference.toFixed(1))} %`;

// the figures of a duel per game type: [key, label, options] — X01 has its own (players.x01.stats.comparison.bars)
const DUEL_FIGURES = {
    cricket: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['marksPerRound', t('Marks per round'), { format: fixed(2), weight: 2 }],
        ['bestMarksPerRound', t('Best game, marks per round'), { format: fixed(2) }],
        ['averagePoints', t('Points per game')],
    ],
    elimination: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['averageVisit', t('Average per visit'), { weight: 2 }],
        ['bestVisit', t('Best visit')],
        ['dartsThrown', t('Darts thrown'), { neutral: true }],
    ],
    clock: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['fewestDarts', t('Fewest darts'), { lowerIsBetter: true }],
        ['averageDarts', t('Darts per game'), { lowerIsBetter: true, weight: 2 }],
        ['hitRate', t('Hit rate'), { format: percent, formatLead: percentLead }],
    ],
    shanghai: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['pointsPerGame', t('Points per game'), { weight: 2 }],
        ['hitRate', t('Hit rate'), { format: percent, formatLead: percentLead }],
        ['shanghais', t('Shanghais')],
    ],
    killer: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['livesTaken', t('Lives taken')],
        ['livesTakenPerGame', t('Lives taken per game'), { weight: 2 }],
        ['survived', t('Games survived')],
    ],
    halveit: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['pointsPerGame', t('Points per game'), { weight: 2 }],
        ['halvedPerGame', t('Halved per game'), { lowerIsBetter: true }],
        ['bestRound', t('Best round')],
    ],
    golf: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['strokesPerHole', t('Strokes per hole'), { lowerIsBetter: true, format: fixed(2), weight: 2 }],
        ['holesInOne', t('Holes in one stroke')],
        ['bestRound', t('Fewest strokes in a game'), { lowerIsBetter: true }],
    ],
    tactics: [
        ['wins', t('Won games'), { weight: 2.5 }],
        ['pointsPerGame', t('Points per game')],
        ['marksPerRound', t('Marks per round'), { format: fixed(2), weight: 2 }],
        ['closedPerGame', t('Numbers closed per game')],
    ],
};

const rowOf = (key, label, { format, ...options } = {}, values) => ({
    key, label, values: values.map(value => Number(value ?? 0)), texts: format ? values.map(format) : undefined, ...options,
});

/**
 * The rows of a duel in one game type (not X01) from the players of the answer.
 */
export const duelRows = (type, duelPlayers) => (DUEL_FIGURES[type] ?? [])
    .map(([key, label, options]) => rowOf(key, label, options, duelPlayers.map(player => player?.[key])));

/**
 * Each player side by side, in groups: overall, X01, Cricket, Elimination,
 * Around the Clock, the newer games and the trainings. Groups nobody played
 * are left out (SideBySide leaves out rows of only zeros).
 * → [{ key, title, rows }]
 */
export const sideGroups = (sidePlayers) => {
    const values = (pick) => sidePlayers.map(player => pick(player) ?? null);
    const groups = [
        {
            key: 'overall',
            title: t('Overall'),
            rows: [
                rowOf('rating', t('Club rating'), { weight: 2, format: (value) => (value == null ? '–' : String(value)) }, values(player => player.rating?.rating)),
                { ...rowOf('xp', t('Level'), { formatLead: (difference) => `${Math.round(difference)} XP` }, values(player => player.level?.xp)), texts: sidePlayers.map(player => (player.level ? `${player.level.name ?? ''} · ${player.level.xp} XP` : '–')) },
                rowOf('games', t('Games played'), { neutral: true }, values(player => player.games)),
                rowOf('winRate', t('Win rate'), { format: percent, formatLead: percentLead, weight: 2.5 }, values(player => player.winRate)),
                rowOf('badges', t('Badges'), {}, values(player => player.badges)),
            ],
        },
        {
            key: 'x01',
            title: t('X01'),
            rows: [
                rowOf('average', t('3-dart average'), { format: fixed(1), weight: 3 }, values(player => player.x01?.average)),
                rowOf('firstNine', t('First 9 average'), { format: fixed(1), weight: 1.5 }, values(player => player.x01?.firstNine)),
                rowOf('checkoutRate', t('Checkout'), { format: percent, formatLead: percentLead, weight: 2 }, values(player => player.x01?.checkoutRate)),
                rowOf('highestCheckout', t('Highest checkout'), {}, values(player => player.x01?.highestCheckout)),
                rowOf('num180s', t('180s'), {}, values(player => player.x01?.num180s)),
                rowOf('tonPlus', t('Ton-plus visits'), {}, values(player => player.x01?.tonPlus)),
                rowOf('dartsPerLeg', t('Darts per leg'), { lowerIsBetter: true }, values(player => player.x01?.dartsPerLeg)),
                rowOf('bestLeg', t('Best 501 leg (darts)'), { lowerIsBetter: true }, values(player => player.x01?.bestLeg)),
            ],
        },
        {
            key: 'cricket',
            title: t('Cricket'),
            rows: [
                rowOf('cricketGames', t('Games'), { neutral: true }, values(player => player.playedGames?.cricket)),
                rowOf('cricketWins', t('Wins'), {}, values(player => player.wonGames?.cricket)),
                rowOf('marksPerRound', t('Marks per round'), { format: fixed(2) }, values(player => player.cricket?.marksPerRound)),
                rowOf('bestMarksPerRound', t('Best game, marks per round'), { format: fixed(2) }, values(player => player.cricket?.bestMarksPerRound)),
            ],
        },
        {
            key: 'elimination',
            title: t('Elimination'),
            rows: [
                rowOf('eliminationGames', t('Games'), { neutral: true }, values(player => player.playedGames?.elimination)),
                rowOf('eliminationWins', t('Wins'), {}, values(player => player.wonGames?.elimination)),
                rowOf('averageVisit', t('Average per visit'), {}, values(player => player.elimination?.averageVisit)),
                rowOf('bestVisit', t('Best visit'), {}, values(player => player.elimination?.bestVisit)),
            ],
        },
        {
            key: 'clock',
            title: t('Around the Clock'),
            rows: [
                rowOf('clockGames', t('Games'), { neutral: true }, values(player => player.playedGames?.clock)),
                rowOf('clockWins', t('Wins'), {}, values(player => player.wonGames?.clock)),
                rowOf('fewestDarts', t('Fewest darts'), { lowerIsBetter: true }, values(player => player.clock?.fewestDarts)),
                rowOf('hitRate', t('Hit rate'), { format: percent, formatLead: percentLead }, values(player => player.clock?.hitRate)),
            ],
        },
        {
            key: 'rules',
            title: t('More games'),
            rows: ['shanghai', 'killer', 'halveit', 'golf', 'tactics'].flatMap(kind => [
                rowOf(`${kind}Wins`, t('{{game}}: wins', { game: GAME_TITLES[kind] }), {}, values(player => player.rules?.[kind]?.wins)),
            ]),
        },
        {
            key: 'trainings',
            title: t('Trainings'),
            rows: TRAININGS.map(training => {
                const bests = values(player => player.trainings?.[training.id]?.best);
                return {
                    ...rowOf(`training-${training.id}`, training.title, { lowerIsBetter: training.higherIsBetter === false }, bests),
                    texts: bests.map(best => (best == null ? '–' : training.format(best))),
                };
            }),
        },
    ];
    return groups;
};

// the game types to compare head to head, with their names
export const COMPARE_TYPES = ['x01', 'cricket', 'elimination', 'clock', 'shanghai', 'killer', 'halveit', 'golf', 'tactics'];
export const typeTitle = (type) => GAME_TITLES[type] ?? type;

// where a game between the players is set up, with them already chosen
export const setupLinkOf = (type, players) => {
    const path = ['x01', 'cricket', 'elimination', 'clock'].includes(type) ? `/${type}` : `/play/${type}`;
    return `${path}?players=${players.map(player => player.id).join(',')}`;
};
