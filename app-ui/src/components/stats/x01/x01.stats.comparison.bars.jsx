import { Fragment } from 'react';
import ComparisonBar from '../../elements/comparison.bar';

/**
 * The players of an X01 game side by side as bars, for the whole game
 * (valueKey "game") or one set ("set-1", …).
 */
const X01StatsComparisonBars = ({ valueKey, game }) => {
    const players = game.players || [];

    // a value of a player's statistics, or the default when it is missing
    const getPlayerStat = (playerId, path = [], defaultValue = 0) => {
        return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), game.playerModels[playerId]) ?? defaultValue;
    };

    const buildData = (name, pathMapper, unit) => ({
        name,
        unit,
        ...Object.fromEntries(
            players.map((playerId, idx) => {
                const val = pathMapper(playerId);
                return [`player${idx + 1}`, val];
            })
        )
    });

    const getWonLegsData = () =>
        [buildData('Legs won', (playerId) => getPlayerStat(playerId, ['legsWon', valueKey]))];

    const getRangesData = (name, range) =>
        [buildData(name, (playerId) => getPlayerStat(playerId, ['scoreRanges', valueKey, range]))];

    // the 3-dart average over all visits, as in the key figures and on the profile
    const getAverageData = () =>
        [buildData('3-dart average', (playerId) => {
            const avg = getPlayerStat(playerId, ['averages', valueKey, 'overall'], 0);
            return Number(avg.toFixed(1));
        })];

    const getCheckoutData = () => {
        const checkout = {
            name: 'Checkout',
            unit: '%'
        };

        game.players.forEach((playerId, idx) => {
            const { hit = 0, total = 0 } =
                game?.playerModels?.[playerId]?.checkout?.[valueKey] ?? {};

            const percent = total ? ((100 * hit) / total).toFixed(1) : '0.0';

            const key = `player${idx + 1}`;
            checkout[key] = `${percent}`;
            checkout[`${key}sub`] = `(${hit}/${total})`;
        });

        return [checkout];
    };

    return (
        <Fragment>
            <ComparisonBar data={getWonLegsData()} />
            <ComparisonBar data={getRangesData('180s', '180')} />
            <ComparisonBar data={getRangesData('160+', '160-179')} />
            <ComparisonBar data={getRangesData('140+', '140-159')} />
            <ComparisonBar data={getRangesData('120+', '120-139')} />
            <ComparisonBar data={getRangesData('100+', '100-119')} />
            <ComparisonBar data={getAverageData()} />
            <ComparisonBar data={getCheckoutData()} />
        </Fragment>
    );
};

export default X01StatsComparisonBars;
