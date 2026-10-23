import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { FaTrophy } from 'react-icons/fa6';

import GameTypeIcon from './game.type.icon';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t } from '../../utils/i18n';

const SHOWN = 10;
const PODIUM = ['#ffc94d', '#c9d1d9', '#d29a6a'];

/**
 * Players ranked by a number, as the badges, trainings and games pages show
 * them: a trophy for the first three places (the same number shares a place),
 * a bar, a line about each player and a type badge. The first ten; with more
 * players a search (keeping each player's place) and Show all, and the way
 * to the players list. Each player leads to their statistics.
 *
 * entries: [{ id, player, value, label (e.g. "6 games"), line, icon (a game type) }], best first
 */
const PlayerRanking = ({ entries, barClass = 'is-green' }) => {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const term = search.trim().toLowerCase();
    const matches = (entry) => [entry.player?.nickname, entry.player?.firstname, entry.player?.lastname, `${entry.player?.firstname} ${entry.player?.lastname}`]
        .some(text => text?.toLowerCase().includes(term));
    const shown = term ? entries.filter(matches) : showAll ? entries : entries.slice(0, SHOWN);
    const placeOf = (entry) => entries.findIndex(other => other.value === entry.value) + 1;
    const top = entries[0]?.value || 1;

    return (
        <>
            {entries.length > SHOWN &&
                <span className="p-input-icon-left w-100 mb-3">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} className="w-100" />
                </span>}
            {shown.length === 0
                ? <span className="text-faint fs-7">{term ? <>{t('No player matches “')}{search}”.</> : t('Nobody yet.')}</span>
                : <ol className="badge-ranking list-unstyled m-0">
                    {shown.map(entry => {
                        const place = placeOf(entry);
                        const podium = entry.value > 0 && place <= 3 ? PODIUM[place - 1] : null;
                        return (
                            <li key={entry.id}>
                                <Link to={`/players/${entry.id}`} className="badge-ranking-row" style={{ '--podium': podium ?? 'transparent' }}>
                                    <span className="badge-ranking-place" aria-label={t('Place {{place}}', { place })}>
                                        {podium ? <FaTrophy style={{ color: podium }} aria-hidden="true" /> : place}
                                    </span>
                                    <Avatar
                                        label={entry.player?.profileImg ? undefined : resolvePlayerInitials(entry.player?.firstname ?? entry.player?.nickname ?? '?', entry.player?.lastname ?? '')}
                                        image={resolvePlayerImg(entry.player?.profileImg)}
                                        shape="circle"
                                        className="avatar-md bg-surface-high flex-shrink-0"
                                    />
                                    <span className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                                        <span className="d-flex align-items-baseline justify-content-between gap-2">
                                            <span className="text-default fw-semibold text-truncate">{entry.player?.nickname ?? t('Unknown player')}</span>
                                            <span className="text-subtle fs-8 text-nowrap">{entry.label}</span>
                                        </span>
                                        <span className={`badge-ranking-bar ${barClass}`} aria-hidden="true"><span style={{ width: `${entry.value / top * 100}%` }} /></span>
                                        {entry.line && <span className="text-faint fs-8">{entry.line}</span>}
                                    </span>
                                    {entry.icon && <span className="d-none d-sm-inline-flex"><GameTypeIcon type={entry.icon} /></span>}
                                </Link>
                            </li>
                        );
                    })}
                </ol>}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                {!term && !showAll && entries.length > SHOWN
                    ? <Button type="button" label={t('Show all {{length}} players', { length: entries.length })} icon="pi pi-chevron-down" size="small" text onClick={() => setShowAll(true)} />
                    : <span />}
                {/* the players list, for the statistics of any player */}
                <Link to={term ? `/players?search=${encodeURIComponent(search.trim())}` : '/players'} className="text-subtle fs-8">
                    {t('All players of the club')}{' '}<i className="pi pi-arrow-right fs-9" aria-hidden="true" />
                </Link>
            </div>
        </>
    );
};

export default PlayerRanking;
