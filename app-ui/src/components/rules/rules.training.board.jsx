import { useEffect, useState } from 'react';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { FaMedal } from 'react-icons/fa6';

import RulesService from '../../services/rules.service';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const MEDALS = ['gold', 'silver', 'bronze'];

const VIEWS = [
    { label: t('Best'), value: 'best' },
    { label: t('Recent'), value: 'recent' },
];

/**
 * The scoreboard of a training in the club: every player's best, or the
 * latest attempts. "highlight" marks the attempt just saved.
 */
const RulesTrainingBoard = ({ definition, version = 0, highlight = null }) => {
    const [entries, setEntries] = useState(null);
    const [view, setView] = useState('best');

    useEffect(() => {
        let current = true;
        RulesService.loadTrainings(definition.id)
            .then(loaded => { if (current) setEntries(loaded); })
            .catch(() => { if (current) setEntries([]); });
        return () => { current = false; };
    }, [definition.id, version]);

    const higher = definition.higherIsBetter !== false;
    const better = (a, b) => (higher ? b.score - a.score : a.score - b.score);
    let rows = entries ?? [];
    if (view === 'best') {
        const best = new Map();
        rows.forEach(entry => {
            const known = best.get(entry.player?.id);
            if (!known || better(entry, known) < 0) best.set(entry.player?.id, entry);
        });
        rows = [...best.values()].sort(better);
    }
    rows = rows.slice(0, 15);

    return (
        <Panel header={t('Scoreboard')} className="h-100">
            <div className="d-flex justify-content-center mb-3">
                <SelectButton value={view} options={VIEWS} onChange={(e) => e.value && setView(e.value)} className="p-selectbutton-pills" aria-label={t('Scoreboard')} />
            </div>
            {entries === null
                ? <span className="text-faint fs-8">{t('Loading…')}</span>
                : rows.length === 0
                    ? <span className="text-faint fs-8">{t('Nobody has played this training yet.')}</span>
                    // as the scoreboard of Around the Clock: the podium as medals, the player with the date, the result
                    : <ol className="atc-rows">
                        {rows.map((entry, index) => {
                            const player = entry.player ?? {};
                            const rank = index + 1;
                            const podium = view === 'best' && rank <= 3;
                            return (
                                <li key={entry.id} className={`atc-row ${entry.id === highlight ? 'is-latest' : ''}`}>
                                    {podium
                                        ? <span className={`badge-medal badge-medal-sm badge-${MEDALS[rank - 1]} atc-medal`} role="img" aria-label={t('Place {{place}}', { place: rank })}><FaMedal aria-hidden="true" /></span>
                                        : <span className="atc-rank">{view === 'best' ? rank : ''}</span>}
                                    <Avatar
                                        image={resolvePlayerImg(player.profileImg)}
                                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                        shape="circle"
                                        className="avatar-sm flex-shrink-0"
                                    />
                                    <span className="atc-row-player">
                                        <span className="atc-row-name">
                                            {player.nickname ?? t('Unknown player')}
                                            {entry.id === highlight && <span className="atc-row-new">{t('New')}</span>}
                                        </span>
                                        <span className="atc-row-detail">{formatDate(entry.createdAt)}</span>
                                    </span>
                                    <span className="atc-row-time">{definition.format(entry.score)}</span>
                                </li>
                            );
                        })}
                    </ol>}
        </Panel>
    );
};

export default RulesTrainingBoard;
