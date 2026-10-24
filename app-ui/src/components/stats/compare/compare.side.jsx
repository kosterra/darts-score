import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import SideBySide from '../common/side.by.side';
import { CardSkeleton } from '../../elements/skeletons';
import { CompareInsights } from './compare.duel';
import { sideGroups } from './compare.figures';
import { t } from '../../../utils/i18n';

// a group is shown when someone has something in it
const hasFigures = (group) => group.rows.some(row => !row.neutral && row.values.some(value => Number(value) > 0));

/**
 * Each player on their own, side by side: their figures from all their games
 * (also when they never met), in groups by game, with the trainings, and the
 * comparison in words. request: { scope, dateFilter, from, to, lastGames }
 */
const CompareSide = ({ players, request, colours = [] }) => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const key = JSON.stringify({ ids: players.map(player => player.id), request });

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setFailed(false);
        StatsService.loadSideBySide({ ...request, playerIds: players.map(player => player.id) })
            .then(answer => { if (!cancelled) setData(answer); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    if (failed) return <p className="text-subtle m-0">{t('The players could not be compared. Please try again.')}</p>;
    if (!data) {
        return (
            <div className="row g-4" aria-busy="true">
                <div className="col-12 col-xl-6"><CardSkeleton title={t('Overall')} /></div>
                <div className="col-12 col-xl-6"><CardSkeleton title={t('X01')} /></div>
            </div>
        );
    }

    // the answer in the order of the players chosen
    const ordered = players.map(player => data.players.find(entry => entry.id === player.id) ?? {});
    const groups = sideGroups(ordered).filter(hasFigures);
    const [overall, x01] = sideGroups(ordered);

    return (
        <div className="d-flex flex-column gap-4">
            <CompareInsights rows={[...overall.rows, ...x01.rows]} players={players} colours={colours} />
            <div className="row g-4">
                {groups.map(group => (
                    <div key={group.key} className="col-12 col-xl-6">
                        <Panel header={group.title} className="h-100">
                            <SideBySide rows={group.rows} players={players} />
                        </Panel>
                    </div>
                ))}
            </div>
            <p className="text-faint fs-8 m-0">{t('Side by side shows each player\'s own games, also against others. The club rating counts every game in the club except the friendly ones.')}</p>
        </div>
    );
};

export default CompareSide;
