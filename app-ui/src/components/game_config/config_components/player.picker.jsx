import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

import PlayerForm from '../../elements/player.form';
import GuestForm from '../../elements/guest.form';
import PlayerService from '../../../services/player.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { useAuth } from '../../../utils/auth.context';
import { MAX_PLAYERS, MIN_PLAYERS, moveItem, offeredPlayers, playedWhen, shuffled, toggled, withStarter } from '../../../utils/player.picker';

// cards shown before "Show all": with the guest card three rows of four
const SHOWN_PLAYERS = 11;

const PlayerAvatar = ({ player, className = 'avatar-md' }) => (
    <Avatar
        image={resolvePlayerImg(player.profileImg)}
        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname, player.lastname)}
        shape="circle"
        className={className}
    />
);

/**
 * The players of a game: tap the cards to choose 2 to 4 players, those who
 * played lately come first. The order row below is the order they throw in:
 * drag a player (or use the arrows) to change it, shuffle it, or put the
 * winner of the bull-off first.
 *
 * selected: the chosen players in throwing order
 * onChange(players)
 * initialIds: the players of the last game, chosen once the list has loaded
 * single: one player only, e.g. for a training: a tap chooses that player
 * minPlayers: how many players are needed, e.g. 1 for a training
 */
const PlayerPicker = ({ selected, onChange, initialIds = [], single = false, minPlayers = MIN_PLAYERS }) => {
    const { isClubAdmin } = useAuth();
    const [players, setPlayers] = useState([]);
    const [lastPlayed, setLastPlayed] = useState({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [dragged, setDragged] = useState(null);
    const [bullOff, setBullOff] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const restored = useRef(false);

    const load = async () => {
        try {
            const [list, played] = await Promise.all([
                PlayerService.searchPlayers(''),
                PlayerService.lastPlayed().catch(() => ({})),
            ]);
            setPlayers(list);
            setLastPlayed(played);
            // the players of the last game, those still in the club, in the same order
            if (!restored.current) {
                restored.current = true;
                const again = initialIds.map(id => list.find(player => player.id === id)).filter(Boolean).slice(0, single ? 1 : MAX_PLAYERS);
                if (again.length && !selected.length) onChange(again);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // guests of this game are offered with the club's players
    const all = useMemo(() => [...players, ...selected.filter(player => !players.some(known => known.id === player.id))], [players, selected]);
    const offered = useMemo(() => offeredPlayers(all, lastPlayed, search), [all, lastPlayed, search]);
    // the most recent players and the chosen ones; searching looks through all
    const shown = useMemo(() => showAll || search.trim()
        ? offered
        : offered.filter((player, index) => index < SHOWN_PLAYERS || selected.some(chosen => chosen.id === player.id)),
    [offered, showAll, search, selected]);
    const hidden = offered.length - shown.length;
    const positionOf = (player) => selected.findIndex(chosen => chosen.id === player.id);
    const isFull = !single && selected.length >= MAX_PLAYERS;

    const choose = (player) => {
        onChange(single ? toggled(selected, player, 1).length ? [player] : [] : toggled(selected, player));
        setBullOff(false);
    };

    const addGuest = (guest) => {
        setPlayers(list => [...list, guest]);
        if (single) onChange([guest]);
        else if (!isFull) onChange([...selected, guest]);
    };

    const move = (from, to) => onChange(moveItem(selected, from, to));

    const missing = minPlayers - selected.length;

    return (
        <div className="player-picker">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <span className="p-input-icon-left flex-grow-1">
                    <i className="pi pi-search" />
                    <InputText
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search players"
                        aria-label="Search players"
                        className="w-100"
                    />
                </span>
                {isClubAdmin && <PlayerForm onPlayerAdd={load} label="New player" />}
            </div>

            <div className="player-picker-grid" role="group" aria-label="Players of the club">
                {shown.map(player => {
                    const position = positionOf(player);
                    const chosen = position >= 0;
                    const when = playedWhen(lastPlayed[player.id]);
                    return (
                        <button
                            key={player.id}
                            type="button"
                            className={`player-pick-card ${chosen ? 'is-chosen' : ''}`}
                            aria-pressed={chosen}
                            disabled={!chosen && isFull}
                            title={!chosen && isFull ? `Up to ${MAX_PLAYERS} players` : undefined}
                            onClick={() => choose(player)}
                        >
                            {chosen && !single && <span className="player-pick-number" aria-label={`Throws ${position + 1}.`}>{position + 1}</span>}
                            <PlayerAvatar player={player} />
                            <span className="player-pick-name">{player.nickname}</span>
                            <span className="player-pick-detail">
                                {player.guest ? 'Guest' : when ? `Played ${when}` : `${player.firstname} ${player.lastname}`}
                            </span>
                        </button>
                    );
                })}
                <GuestForm
                    onGuestAdd={addGuest}
                    trigger={(open) => (
                        <button type="button" className="player-pick-card is-guest" onClick={open} disabled={isFull}>
                            <span className="player-pick-plus pi pi-user-plus" aria-hidden="true" />
                            <span className="player-pick-name">Guest</span>
                            <span className="player-pick-detail">Plays this game only</span>
                        </button>
                    )}
                />
            </div>
            {hidden > 0 &&
                <div className="text-center mt-2">
                    <Button type="button" label={`Show all ${offered.length} players`} icon="pi pi-chevron-down" size="small" text onClick={() => setShowAll(true)} />
                </div>
            }
            {!loading && !offered.length && search && <div className="text-faint fs-7 mt-2">No player matches “{search}”.</div>}

            {!single && <div className="player-order mt-4" aria-label="Throwing order">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                    <span className="text-subtle fs-7 fw-semibold">
                        Throwing order
                        <span className="text-faint fw-normal"> · {selected.length} of {MAX_PLAYERS}</span>
                    </span>
                    <div className="d-flex gap-2">
                        <Button
                            type="button" icon="pi pi-sync" label="Shuffle" size="small" text
                            disabled={selected.length < 2}
                            onClick={() => { onChange(shuffled(selected)); setBullOff(false); }}
                        />
                        <Button
                            type="button" icon="pi pi-bullseye" label="Bull-off" size="small" text
                            disabled={selected.length < 2}
                            aria-expanded={bullOff}
                            onClick={() => setBullOff(open => !open)}
                        />
                    </div>
                </div>

                {bullOff && selected.length >= 2 &&
                    <div className="player-bull-off mb-2">
                        <span className="text-subtle fs-8">Who was closest to the bull? They throw first.</span>
                        <div className="d-flex flex-wrap gap-2 mt-2">
                            {selected.map(player => (
                                <Button
                                    key={player.id} type="button" label={player.nickname} size="small" outlined
                                    onClick={() => { onChange(withStarter(selected, player.id)); setBullOff(false); }}
                                />
                            ))}
                        </div>
                    </div>
                }

                {selected.length
                    ? (
                        <ol className="player-order-row">
                            {selected.map((player, index) => (
                                <li
                                    key={player.id}
                                    className={`player-order-item ${dragged === index ? 'is-dragged' : ''}`}
                                    draggable
                                    onDragStart={(e) => { setDragged(index); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => { e.preventDefault(); if (dragged !== null) move(dragged, index); setDragged(null); }}
                                    onDragEnd={() => setDragged(null)}
                                >
                                    <span className="player-order-number">{index + 1}</span>
                                    <PlayerAvatar player={player} className="avatar-sm" />
                                    <span className="player-order-name">{player.nickname}</span>
                                    <span className="player-order-actions">
                                        <button type="button" className="player-order-button" aria-label={`Move ${player.nickname} earlier`} title="Earlier" disabled={index === 0} onClick={() => move(index, index - 1)}>
                                            <i className="pi pi-chevron-left" aria-hidden="true" />
                                        </button>
                                        <button type="button" className="player-order-button" aria-label={`Move ${player.nickname} later`} title="Later" disabled={index === selected.length - 1} onClick={() => move(index, index + 1)}>
                                            <i className="pi pi-chevron-right" aria-hidden="true" />
                                        </button>
                                        <button type="button" className="player-order-button" aria-label={`Remove ${player.nickname}`} title="Remove" onClick={() => choose(player)}>
                                            <i className="pi pi-times" aria-hidden="true" />
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )
                    : <div className="text-faint fs-7">Tap the players who play, in the order they throw.</div>
                }
                {selected.length > 0 && missing > 0 && <div className="text-faint fs-8 mt-2">Choose {missing} more {missing === 1 ? 'player' : 'players'} to start.</div>}
            </div>}
        </div>
    );
};

export default PlayerPicker;
