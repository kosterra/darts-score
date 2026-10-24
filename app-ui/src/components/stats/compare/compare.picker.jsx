import { useEffect, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';

import StatsService from '../../../services/stats.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

const TOP_BY_LEVEL = 4;
const OPPONENTS_SHOWN = 3;

/**
 * Who is compared: quick picks (me against someone, my usual opponents, the
 * club's best by level), then every player of the club to tick. On a phone
 * the chosen players stand as chips at the top and "Change players" opens the
 * list in place; it is open as long as fewer than two are chosen.
 * colours: the players' colours in the charts, in the order chosen.
 */
const ComparePicker = ({ players, selectedIds, onChange, levels = {}, ownId = null, maxPlayers, colours }) => {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
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

    const usual = opponents.map(entry => byId.get(entry.playerId)).filter(Boolean).slice(0, OPPONENTS_SHOWN);
    const best = [...players]
        .filter(player => levels[player.id])
        .sort((a, b) => (levels[b.id]?.xp ?? 0) - (levels[a.id]?.xp ?? 0))
        .slice(0, TOP_BY_LEVEL);
    const term = search.trim().toLowerCase();
    const visible = players.filter(player => !term || [player.nickname, player.firstname, player.lastname].some(value => value?.toLowerCase().includes(term)));
    const listOpen = open || selected.length < 2;

    return (
        <Panel header={t('Players')} className="players-picker">
            <div className="d-flex flex-column gap-3">
                {/* on a phone: the chosen players at the top, the list only when asked for */}
                {selected.length > 0 &&
                    <div className="compare-chosen d-lg-none">
                        {selected.map((player, index) => (
                            <span key={player.id} className="compare-chip">
                                <span className="players-picker-colour" style={{ background: colours[index] }} aria-hidden="true" />
                                {player.nickname}
                                <button type="button" className="compare-chip-remove" onClick={() => toggle(player)} aria-label={t('Remove {{nickname}}', { nickname: player.nickname })}><i className="pi pi-times" aria-hidden="true" /></button>
                            </span>
                        ))}
                        {selected.length >= 2 &&
                            <Button type="button" label={open ? t('Done') : t('Change players')} icon={open ? 'pi pi-check' : 'pi pi-user-edit'} size="small" severity="secondary" text onClick={() => setOpen(!open)} aria-expanded={open} />}
                    </div>}

                <div className={`compare-picker-list ${listOpen ? 'is-open' : ''}`}>
                    {/* quick picks */}
                    {(ownId || best.length >= 2) &&
                        <div className="d-flex flex-column gap-2">
                            <span className="text-faint fs-8">{t('Quick picks')}</span>
                            <div className="compare-quick">
                                {ownId && <Button type="button" label={t('Me vs …')} icon="pi pi-user" size="small" severity="secondary" outlined onClick={() => { onChange([ownId]); setOpen(true); }} />}
                                {ownId && usual.map(opponent => (
                                    <Button key={opponent.id} type="button" label={t('Me vs {{nickname}}', { nickname: opponent.nickname })} size="small" severity="secondary" outlined onClick={() => choose([ownId, opponent.id])} />
                                ))}
                                {best.length >= 2 && <Button type="button" label={t('The top {{count}} by level', { count: best.length })} icon="pi pi-star" size="small" severity="secondary" outlined onClick={() => choose(best.map(player => player.id))} />}
                            </div>
                        </div>}

                    <span className="p-input-icon-left w-100">
                        <i className="pi pi-search" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} className="w-100" />
                    </span>
                    <span className="text-faint fs-8">{t('Pick two to {{max}} players to compare them.', { max: maxPlayers })}</span>
                    {players.length === 0 && <span className="text-subtle">{t('This club has no players yet.')}</span>}
                    <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                        {visible.map(player => {
                            const index = selectedIds.indexOf(player.id);
                            const isSelected = index !== -1;
                            const isFull = !isSelected && selectedIds.length >= maxPlayers;
                            return (
                                <li key={player.id}>
                                    <label htmlFor={`pick-${player.id}`} className={`players-picker-row ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}>
                                        <Checkbox inputId={`pick-${player.id}`} checked={isSelected} disabled={isFull} onChange={() => toggle(player)} />
                                        <Avatar
                                            label={resolvePlayerInitials(player.firstname, player.lastname)}
                                            image={resolvePlayerImg(player.profileImg)}
                                            shape="circle"
                                            className="avatar-sm bg-surface-high"
                                        />
                                        <span className="d-flex flex-column flex-grow-1 min-w-0">
                                            <span className="text-default fw-semibold text-truncate">
                                                {player.nickname}{player.id === ownId && <span className="text-faint fw-normal">{' '}{t('(you)')}</span>}
                                            </span>
                                            <span className="text-faint fs-8 text-truncate">{player.firstname} {player.lastname}</span>
                                        </span>
                                        {/* in a comparison the dot is the player's colour in the charts */}
                                        {isSelected && selectedIds.length > 1 && <span className="players-picker-colour" style={{ background: colours[index] }} aria-hidden="true" />}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </Panel>
    );
};

export default ComparePicker;
