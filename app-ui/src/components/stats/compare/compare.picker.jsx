import { useEffect, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

const TOP_BY_LEVEL = 4;
const OPPONENTS_SHOWN = 3;
// cards shown before "Show all", as in the game setups
const SHOWN_PLAYERS = 12;

const PlayerAvatar = ({ player, className = 'avatar-md' }) => (
    <Avatar
        image={resolvePlayerImg(player.profileImg)}
        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
        shape="circle"
        className={className}
    />
);

/**
 * Who is compared, at the top of the page as the players of a game setup:
 * quick picks (me against someone, my usual opponents, the club's best by
 * level), then the cards of the club's players to tap. Once two or more are
 * chosen it closes to a line of them, and "Change players" opens it again.
 * colours: the players' colours in the charts, in the order chosen.
 */
const ComparePicker = ({ players, selectedIds, onChange, levels = {}, ownId = null, maxPlayers, colours }) => {
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    // closed from the start when the link already names two or more
    const [open, setOpen] = useState(() => selectedIds.length < 2);
    const [opponents, setOpponents] = useState([]);

    useEffect(() => {
        if (!ownId) return;
        StatsService.loadOpponents(ownId).then(setOpponents).catch(() => setOpponents([]));
    }, [ownId]);

    const byId = new Map(players.map(player => [player.id, player]));
    const selected = selectedIds.map(id => byId.get(id)).filter(Boolean);
    const toggle = (player) => onChange(selectedIds.includes(player.id)
        ? selectedIds.filter(id => id !== player.id)
        : selectedIds.length < maxPlayers ? [...selectedIds, player.id] : selectedIds);
    const choose = (ids) => { onChange(ids.slice(0, maxPlayers)); setOpen(false); };
    const isOpen = open || selected.length < 2;

    const usual = opponents.map(entry => byId.get(entry.playerId)).filter(Boolean).slice(0, OPPONENTS_SHOWN);
    const best = [...players]
        .filter(player => levels[player.id])
        .sort((a, b) => (levels[b.id]?.xp ?? 0) - (levels[a.id]?.xp ?? 0))
        .slice(0, TOP_BY_LEVEL);
    const term = search.trim().toLowerCase();
    const matching = players.filter(player => !term || [player.nickname, player.firstname, player.lastname].some(value => value?.toLowerCase().includes(term)));
    // the chosen ones stay in view, also behind "Show all"
    const shown = showAll || term ? matching : [...selected, ...matching.filter(player => !selectedIds.includes(player.id))].slice(0, Math.max(SHOWN_PLAYERS, selected.length));

    const toggleButton = selected.length >= 2 && (
        <Button
            type="button"
            label={isOpen ? t('Done') : t('Change players')}
            icon={isOpen ? 'pi pi-check' : 'pi pi-user-edit'}
            size="small"
            severity="secondary"
            text
            onClick={() => setOpen(!isOpen)}
            aria-expanded={isOpen}
        />
    );

    return (
        <Panel header={t('Players')} icons={toggleButton} className="compare-picker mb-4">
            {/* closed: the chosen players in a line */}
            {!isOpen &&
                <ul className="compare-chosen list-unstyled m-0">
                    {selected.map((player, index) => (
                        <li key={player.id} className="compare-chip" style={{ '--compare-colour': colours[index] }}>
                            <PlayerAvatar player={player} className="avatar-xs compare-chip-avatar" />
                            {player.nickname}
                            <button type="button" className="compare-chip-remove" onClick={() => toggle(player)} aria-label={t('Remove {{nickname}}', { nickname: player.nickname })}><i className="pi pi-times" aria-hidden="true" /></button>
                        </li>
                    ))}
                </ul>}

            {isOpen &&
                <div className="d-flex flex-column gap-3">
                    {(ownId || best.length >= 2) &&
                        <div className="compare-quick" aria-label={t('Quick picks')}>
                            <span className="text-faint fs-8">{t('Quick picks')}</span>
                            {ownId && <Button type="button" label={t('Me vs …')} icon="pi pi-user" size="small" severity="secondary" outlined onClick={() => { onChange([ownId]); setOpen(true); }} />}
                            {ownId && usual.map(opponent => (
                                <Button key={opponent.id} type="button" label={t('Me vs {{nickname}}', { nickname: opponent.nickname })} size="small" severity="secondary" outlined onClick={() => choose([ownId, opponent.id])} />
                            ))}
                            {best.length >= 2 && <Button type="button" label={t('The top {{count}} by level', { count: best.length })} icon="pi pi-star" size="small" severity="secondary" outlined onClick={() => choose(best.map(player => player.id))} />}
                        </div>}

                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <span className="p-input-icon-left flex-grow-1">
                            <i className="pi pi-search" />
                            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} className="w-100" />
                        </span>
                        <span className="text-faint fs-8">{t('Pick two to {{max}} players to compare them.', { max: maxPlayers })}</span>
                    </div>

                    {players.length === 0 && <span className="text-subtle">{t('This club has no players yet.')}</span>}
                    <div className="player-picker-grid" role="group" aria-label={t('Players of the club')}>
                        {shown.map(player => {
                            const index = selectedIds.indexOf(player.id);
                            const chosen = index >= 0;
                            const full = !chosen && selectedIds.length >= maxPlayers;
                            return (
                                <button
                                    key={player.id}
                                    type="button"
                                    className={`player-pick-card ${chosen ? 'is-chosen' : ''}`}
                                    aria-pressed={chosen}
                                    disabled={full}
                                    title={full ? t('Up to {{max}} players', { max: maxPlayers }) : undefined}
                                    onClick={() => toggle(player)}
                                    style={chosen ? { '--compare-colour': colours[index] } : undefined}
                                >
                                    {/* the player's colour in the charts */}
                                    {chosen && <span className="player-pick-number compare-pick-colour" aria-hidden="true" />}
                                    <PlayerAvatar player={player} />
                                    <span className="player-pick-name">{player.nickname}{player.id === ownId && <span className="text-faint fw-normal">{' '}{t('(you)')}</span>}</span>
                                    <span className="player-pick-detail">{player.firstname} {player.lastname}</span>
                                </button>
                            );
                        })}
                    </div>
                    {!showAll && !term && matching.length > shown.length &&
                        <div className="text-center">
                            <Button type="button" label={t('Show all {{length}} players', { length: matching.length })} icon="pi pi-chevron-down" size="small" text onClick={() => setShowAll(true)} />
                        </div>}
                    {term && !matching.length && <span className="text-faint fs-7">{t('No player matches “')}{search}”.</span>}
                    {/* with two chosen, the way to the comparison: it stays in view while scrolling through the players */}
                    {selected.length >= 2 &&
                        <div className="compare-picker-done">
                            <Button type="button" label={t('Compare {{count}} players', { count: selected.length })} icon="pi pi-check" onClick={() => setOpen(false)} />
                        </div>}
                </div>}
        </Panel>
    );
};

export default ComparePicker;
