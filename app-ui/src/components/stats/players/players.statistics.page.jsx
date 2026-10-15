import { Fragment, useEffect, useMemo, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';

import PlayerService from '../../../services/player.service';
import PageLoader from '../../elements/page.loader';
import PlayerStats from './player.stats';
import PlayerVSStats from './player.vs.stats';
import ChartConfigOptions from '../common/chart.config.options';
import { useAuth } from '../../../utils/auth.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

// The charts have one colour per player, so a comparison has at most this many
const MAX_PLAYERS = ChartConfigOptions.fillColors.values.length;

/**
 * Player statistics of the selected club: pick one player for their own
 * statistics, or several to compare them. Starts with your own player.
 */
const PlayersStatisticsPage = () => {
    const { user } = useAuth();
    const [players, setPlayers] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        PlayerService.searchPlayers('').then(loaded => {
            const sorted = [...loaded].sort((a, b) => a.nickname.localeCompare(b.nickname));
            setPlayers(sorted);
            const own = sorted.find(player => player.user === user.id);
            if (own) setSelectedIds([own.id]);
        }).catch(error => {
            console.error('Failed to load players', error);
            setPlayers([]);
        });
    }, [user.id]);

    const selected = useMemo(
        () => selectedIds.map(id => players?.find(player => player.id === id)).filter(Boolean),
        [selectedIds, players]
    );

    if (!players) return <PageLoader />;

    const toggle = (player) => setSelectedIds(ids => ids.includes(player.id)
        ? ids.filter(id => id !== player.id)
        : ids.length < MAX_PLAYERS ? [...ids, player.id] : ids);

    const term = search.trim().toLowerCase();
    const visible = players.filter(player =>
        !term || [player.nickname, player.firstname, player.lastname].some(value => value.toLowerCase().includes(term)));


    return (
        <div className="container-fluid p-4 border-0">
            <div className="row g-4">
                <div className="col-12 col-lg-4 col-xxl-3">
                    <Panel header="Players" className="players-picker">
                        <div className="d-flex flex-column gap-3">
                            <span className="p-input-icon-left w-100">
                                <i className="pi pi-search" />
                                <InputText
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search players"
                                    aria-label="Search players"
                                    className="w-100"
                                />
                            </span>
                            <span className="text-faint fs-8">
                                Pick one player for their statistics, or up to {MAX_PLAYERS} to compare them.
                            </span>
                            {players.length === 0 && <span className="text-subtle">This club has no players yet.</span>}
                            <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                                {visible.map(player => {
                                    const index = selectedIds.indexOf(player.id);
                                    const isSelected = index !== -1;
                                    const isFull = !isSelected && selectedIds.length >= MAX_PLAYERS;
                                    return (
                                        <li key={player.id}>
                                            <label
                                                htmlFor={`pick-${player.id}`}
                                                className={`players-picker-row ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                                            >
                                                <Checkbox
                                                    inputId={`pick-${player.id}`}
                                                    checked={isSelected}
                                                    disabled={isFull}
                                                    onChange={() => toggle(player)}
                                                />
                                                <Avatar
                                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                    image={resolvePlayerImg(player.profileImg)}
                                                    shape="circle"
                                                    className="avatar-sm bg-surface-high"
                                                />
                                                <span className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                                                    <span className="text-default fw-semibold text-truncate">
                                                        {player.nickname}{player.user === user.id && <span className="text-faint fw-normal"> (you)</span>}
                                                    </span>
                                                    <span className="text-faint fs-8 text-truncate">{player.firstname} {player.lastname}</span>
                                                </span>
                                                {/* in a comparison the dot is the player's colour in the charts */}
                                                {isSelected && selectedIds.length > 1 &&
                                                    <span className="players-picker-colour" style={{ background: ChartConfigOptions.fillColors.values[index] }} aria-hidden="true" />
                                                }
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </Panel>
                </div>

                <div className="col-12 col-lg-8 col-xxl-9" style={{ minWidth: 0 }}>
                    {selected.length === 0 &&
                        <header className="bg-surface-translucent rounded-2 p-4 mb-4">
                            <h1 className="fs-2 fw-semibold text-default m-0">Player statistics</h1>
                            <span className="text-subtle">Pick a player on the left to see their profile and statistics, or several to compare them.</span>
                        </header>
                    }
                    {selected.length === 1 && <PlayerStats player={selected[0]} isOwn={selected[0].user === user.id} />}
                    {selected.length > 1 &&
                        <>
                            <header className="bg-surface-translucent rounded-2 p-4 mb-4 d-flex flex-column gap-3">
                                <span className="text-faint fs-8 text-uppercase text-center" style={{ letterSpacing: '0.08em' }}>Head to head</span>
                                <div className="d-flex flex-wrap justify-content-center align-items-center gap-4">
                                    {selected.map((player, index) => (
                                        <Fragment key={player.id}>
                                            {index > 0 && <span className="text-faint fw-semibold fs-5">vs.</span>}
                                            {/* the players face each other: the left half shows name then picture, the right half picture then name */}
                                            <span className={`d-flex align-items-center gap-3 ${index < selected.length / 2 ? 'flex-row-reverse text-end' : ''}`}>
                                                <Avatar
                                                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                                                    image={resolvePlayerImg(player.profileImg)}
                                                    shape="circle"
                                                    className="avatar-lg bg-surface-high compare-avatar"
                                                    style={{ '--compare-colour': ChartConfigOptions.fillColors.values[index] }}
                                                />
                                                <span className="d-flex flex-column">
                                                    <span className="fs-4 fw-semibold text-default">{player.nickname}</span>
                                                    <span className="text-subtle fs-7">{player.firstname} {player.lastname}</span>
                                                </span>
                                            </span>
                                        </Fragment>
                                    ))}
                                </div>
                            </header>
                            <PlayerVSStats players={selected} />
                        </>
                    }
                </div>
            </div>
        </div>
    );
};

export default PlayersStatisticsPage;
