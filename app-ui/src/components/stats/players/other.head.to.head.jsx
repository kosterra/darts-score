import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import SideBySide from '../common/side.by.side';
import HeadToHeadLayout from './head.to.head.layout';
import { t } from '../../../utils/i18n';

// the figures compared per game type: [label, key of the player's figures, format, options]
const FIGURES = {
    cricket: [
        [t('Won games'), 'wins'],
        [t('Marks per round'), 'marksPerRound', (value) => value?.toFixed(2)],
        [t('Best game, marks per round'), 'bestMarksPerRound', (value) => value?.toFixed(2)],
        [t('Points per game'), 'averagePoints'],
    ],
    elimination: [
        [t('Won games'), 'wins'],
        [t('Average per visit'), 'averageVisit'],
        [t('Best visit'), 'bestVisit'],
        [t('Darts thrown'), 'dartsThrown', null, { neutral: true }],
    ],
};

const TITLES = { cricket: t('Cricket head to head'), elimination: t('Elimination head to head') };

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
        return <p className="text-subtle m-0">{t('These players have no finished')}{' '}{type === 'cricket' ? t('Cricket') : t('Elimination')}{' '}{t('games together with these filters.')}</p>;
    }

    const rows = FIGURES[type].map(([label, key, format, options = {}]) => {
        const values = players.map((_, index) => Number(data.players[index]?.[key] ?? 0));
        return { key, label, values, texts: format ? values.map(value => format(value)) : undefined, ...options };
    });

    return (
        <Panel header={TITLES[type]}>
            <HeadToHeadLayout gamesTogether={data.playedGames} games={data.games} players={players}>
                <SideBySide rows={rows} players={players} />
            </HeadToHeadLayout>
        </Panel>
    );
};

export default OtherHeadToHead;
