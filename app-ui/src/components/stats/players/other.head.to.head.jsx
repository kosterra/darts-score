import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import ComparisonBar from '../../elements/comparison.bar';
import StatTile from './stat.tile';
import HeadToHeadTimeline from './head.to.head.timeline';

// the figures compared per game type: [label, key of the player's figures, format]
const FIGURES = {
    cricket: [
        ['Won games', 'wins'],
        ['Marks per round', 'marksPerRound', (value) => value?.toFixed(2)],
        ['Best game, marks per round', 'bestMarksPerRound', (value) => value?.toFixed(2)],
        ['Points per game', 'averagePoints'],
    ],
    elimination: [
        ['Won games', 'wins'],
        ['Average per visit', 'averageVisit'],
        ['Best visit', 'bestVisit'],
        ['Darts thrown', 'dartsThrown'],
    ],
};

const TITLES = { cricket: 'Cricket head to head', elimination: 'Elimination head to head' };

/**
 * Head to head in Cricket or Elimination: games together, the latest winners
 * and each player's figures side by side.
 */
const OtherHeadToHead = ({ type, players, request }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        setData(null);
        StatsService.loadHeadToHead({ ...request, type }).then(setData).catch(() => setData({ playedGames: 0, players: [], games: [] }));
        // the request is rebuilt on every render; its content is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, JSON.stringify(request)]);

    if (!data) return null;
    if (data.playedGames === 0) {
        return <p className="text-subtle m-0">These players have no finished {type === 'cricket' ? 'Cricket' : 'Elimination'} games together with these filters.</p>;
    }

    const figureOf = (playerIndex, key, format) => {
        const value = data.players[playerIndex]?.[key];
        return format ? Number(format(value) ?? 0) : value ?? 0;
    };

    return (
        <Panel header={TITLES[type]}>
            <div className="row g-3 mb-3 align-items-center">
                <div className="col-12 col-md-3 col-xl-2">
                    <StatTile label="Games together" value={data.playedGames} />
                </div>
                <div className="col-12 col-md-9 col-xl-10" style={{ minWidth: 0 }}>
                    <span className="text-faint fs-8">Latest winners</span>
                    <HeadToHeadTimeline games={data.games} players={players} />
                </div>
            </div>
            <div className="d-flex flex-column align-items-center gap-1 mt-2">
                {FIGURES[type].map(([label, key, format]) => (
                    <ComparisonBar
                        key={key}
                        data={[{ name: label, ...Object.fromEntries(players.map((_, index) => [`player${index + 1}`, figureOf(index, key, format)])) }]}
                    />
                ))}
            </div>
        </Panel>
    );
};

export default OtherHeadToHead;
