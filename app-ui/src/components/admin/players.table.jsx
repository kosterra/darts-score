import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import PlayerService from '../../services/player.service';
import StatsService from '../../services/stats.service';
import LevelBadge from '../players/level.badge';
import PlayerForm from '../elements/player.form';
import PlayerLogin from '../elements/player.login';
import PlayerClubsDialog from './player.clubs.dialog';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import { formatDateTime } from './admin.format';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import useClubSelection from './use.club.selection';

const KIND_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Members', value: 'members' },
    { label: 'Guests', value: 'guests' },
];

const matches = (player, term) => [player.nickname, player.firstname, player.lastname]
    .some(value => value?.toLowerCase().includes(term));

/**
 * Players and guests in one table.
 * scope "club": the selected club's players for everyone in it; its admins also
 * add, edit, give a login, show on the public page, turn guests into members and delete.
 * scope "all": players of the clubs a global admin picks, with their club.
 */
const PlayersTable = ({ scope = 'club' }) => {
    const toast = useRef(null);
    const { isClubAdmin, user } = useAuth();
    // a player with a login decides about their public nickname themselves
    const decidesThemselves = (player) => Boolean(player.user) && player.user !== user?.id;
    // back from a player's page after moving or removing them: what happened
    const { state: arrival } = useLocation();
    const noticeShown = useRef(false);
    useEffect(() => {
        if (!arrival?.notice || noticeShown.current) return;
        noticeShown.current = true;
        toast.current?.show({ severity: 'success', summary: arrival.notice, life: 3500 });
        window.history.replaceState({ ...window.history.state, usr: null }, '');
    }, [arrival]);
    const navigate = useNavigate();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;

    const [players, setPlayers] = useState(null);
    // levels exist per club, so only the club's own list shows them
    const [levels, setLevels] = useState({});

    useEffect(() => {
        if (!acrossClubs) StatsService.loadPlayerLevels().then(setLevels).catch(() => setLevels({}));
    }, [acrossClubs]);
    // the search, the kind, page and order live in the address: back from a player, the list is as it was left
    const [view, setView] = useUrlState({ search: '', kind: 'all', ...TABLE_DEFAULTS });
    const { search, kind } = view;
    const setSearch = (value) => setView({ search: value, page: 1 });
    const setKind = (value) => setView({ kind: value, page: 1 });
    // across clubs: the player whose clubs are being changed
    const [clubsOfPlayerId, setClubsOfPlayerId] = useState(null);

    const showError = (summary, error) =>
        toast.current.show({ severity: 'error', summary, detail: error.message, life: 4000 });

    const loadPlayers = async () => {
        if (acrossClubs && !selectedIds.length) {
            setPlayers([]);
            return;
        }
        try {
            setPlayers(acrossClubs
                ? await AdminService.loadPlayers(selectedIds)
                : await PlayerService.searchPlayers('', { includeGuests: true }));
        } catch (error) {
            setPlayers([]);
            showError('Load players', error);
        }
    };

    useEffect(() => {
        loadPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acrossClubs, selectedIds]);

    const visiblePlayers = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (players ?? [])
            .filter(player => kind === 'all' || (kind === 'guests') === !!player.guest)
            .filter(player => !term || matches(player, term));
    }, [players, search, kind]);

    const onTogglePublic = async (player) => {
        try {
            await PlayerService.setPublicProfile(player.id, !player.publicProfile);
            await loadPlayers();
        } catch (error) {
            showError('Public nickname', error);
        }
    };

    const onMakeMember = async (player) => {
        try {
            await PlayerService.makeMember(player.id);
            await loadPlayers();
        } catch (error) {
            showError('Make club member', error);
        }
    };

    const onDelete = async (player) => {
        try {
            // across clubs a global admin deletes the player from every club; in a club's own
            // list a member of other clubs only leaves this one
            const result = acrossClubs
                ? await AdminService.deletePlayer(player.id)
                : await PlayerService.deletePlayer(player.id);
            const leftClub = result?.removed === 'membership';
            toast.current.show({ severity: 'success', summary: leftClub ? 'Player removed from the club' : 'Player deleted', detail: player.nickname, life: 3000 });
            await loadPlayers();
        } catch {
            showError('Delete player', { message: `${player.nickname} could not be deleted. Please try again.` });
        }
    };

    // a player was added across clubs: show the club they were added to
    const onPlayerAdded = async (clubId) => {
        if (clubId && !selectedIds.includes(clubId)) select([...selectedIds, clubId]);
        else await loadPlayers();
    };

    const onClubsChange = async (summary) => {
        toast.current.show({ severity: 'success', summary, detail: players?.find(player => player.id === clubsOfPlayerId)?.nickname, life: 3000 });
        await loadPlayers();
    };

    const clubsPlayer = players?.find(player => player.id === clubsOfPlayerId) ?? null;

    const kindBody = (player) => player.guest
        ? <Tag value="Guest" severity="secondary" />
        : <Tag value="Member" severity="success" />;

    const loginBody = (player) => player.user
        ? <span className="text-default fs-7"><i className="pi pi-key text-primary me-2" aria-hidden="true" />Has a login</span>
        : <span className="text-faint fs-7">–</span>;

    const publicBody = (player) => player.guest
        ? <span className="text-faint fs-7">–</span>
        : (
            <span className="d-flex flex-column">
                <span className={player.publicProfile ? 'text-default fs-7' : 'text-faint fs-7'}>{player.publicProfile ? 'Nickname shown' : 'Hidden'}</span>
                {decidesThemselves(player) && <span className="text-faint fs-8">their own choice</span>}
            </span>
        );

    // the club's own admins look after their players; across clubs a global admin inspects and deletes
    const actionsBody = (player) => !canManage ? null : (
        <div className="row-actions">
            {!acrossClubs && <>
                <Button type="button" icon="pi pi-user-edit" aria-label={`Edit ${player.nickname}`} tooltip="Edit player" tooltipOptions={{ position: 'top' }} onClick={() => navigate(`/players/${player.id}/edit`)} />
                {player.guest
                    ? <Button type="button" icon="pi pi-user-plus" severity="secondary" aria-label={`Make ${player.nickname} a club member`} tooltip="Make club member" tooltipOptions={{ position: 'top' }} onClick={() => onMakeMember(player)} />
                    : <>
                        <PlayerLogin player={player} onChange={loadPlayers} />
                        <Button
                            type="button"
                            icon={player.publicProfile ? 'pi pi-eye' : 'pi pi-eye-slash'}
                            severity={player.publicProfile ? undefined : 'secondary'}
                            aria-label={player.publicProfile ? `Hide the nickname of ${player.nickname} on the public page` : `Show the nickname of ${player.nickname} on the public page`}
                            tooltip={decidesThemselves(player)
                                ? `${player.nickname} has a login and decides this on their player profile`
                                : player.publicProfile ? 'Nickname is public' : 'Nickname is hidden publicly'}
                            tooltipOptions={{ position: 'top', showOnDisabled: true }}
                            disabled={decidesThemselves(player)}
                            onClick={() => onTogglePublic(player)}
                        />
                    </>
                }
            </>}
            {/* a club admin of several clubs finds the clubs of a player on the player's page */}
            {acrossClubs &&
                <Button type="button" icon="pi pi-building" severity="secondary" aria-label={`Clubs of ${player.nickname}`} tooltip="Clubs: add to or remove from a club" tooltipOptions={{ position: 'top' }} onClick={() => setClubsOfPlayerId(player.id)} />
            }
            <JSONViewer data={player} header="Player _RAW Data" />
            <DeletePopup
                data={player}
                header="Delete Player"
                message={acrossClubs && player.clubs?.length > 1
                    ? `player ${player.nickname} from all ${player.clubs.length} clubs`
                    : 'player ' + player.nickname}
                handleDelete={onDelete}
            />
        </div>
    );

    const needsClubs = acrossClubs && !selectedIds.length;

    return (
        <Panel header={acrossClubs ? 'Players of all clubs' : 'Players'}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players" aria-label="Search players" />
                </span>
                <SelectButton value={kind} options={KIND_OPTIONS} onChange={(e) => e.value && setKind(e.value)} aria-label="Members or guests" />
                <div className="ms-auto d-flex align-items-center gap-3">
                    {!needsClubs && <span className="text-faint fs-7">{visiblePlayers.length} {visiblePlayers.length === 1 ? 'player' : 'players'}</span>}
                    {!acrossClubs && isClubAdmin && <PlayerForm onPlayerAdd={loadPlayers} />}
                    {acrossClubs && <PlayerForm onPlayerAdd={onPlayerAdded} clubs={clubs} defaultClubId={selectedIds[0]} label="New player" />}
                </div>
            </AdminToolbar>

            {needsClubs
                ? <ChooseClubsHint what="players" />
                : (
                    <DataTable
                        value={visiblePlayers}
                        dataKey="id"
                        className="admin-table"
                        loading={players === null}
                        {...tableState(view, setView, { sortField: 'nickname', sortOrder: 1 })}
                        emptyMessage={players?.length ? 'No players match these filters.' : 'No players yet.'}
                        responsiveLayout="scroll"
                    >
                        <Column
                            field="nickname"
                            header="Player"
                            sortable
                            // in the club's own list the name opens the player's profile
                            body={(player) => {
                                // members still without a date of birth are marked for the club's admins
                                const missingBirth = canManage && !player.guest && !player.dateOfBirth && (
                                    <i className="pi pi-calendar-times text-warning ms-2 fs-8" title="No date of birth yet: edit the player to add it, it is needed for handicap suggestions" aria-label="No date of birth yet" />
                                );
                                return acrossClubs
                                    ? <PlayerCell player={player}>{missingBirth}</PlayerCell>
                                    : <Link to={`/players/${player.id}`} className="player-link"><PlayerCell player={player}>{missingBirth}</PlayerCell></Link>;
                            }}
                            style={{ minWidth: '14rem' }}
                        />
                        {acrossClubs && <Column header="Clubs" body={(player) => (
                            <div className="d-flex flex-column gap-1">
                                {(player.clubs ?? []).map(club => <ClubCell key={club.id} club={club} />)}
                            </div>
                        )} />}
                        {!acrossClubs && <Column header="Level" body={(player) => player.guest ? <span className="text-faint fs-7">–</span> : <LevelBadge level={levels[player.id]} />} />}
                        <Column header="Type" body={kindBody} />
                        {canManage && <Column header="Login" body={loginBody} />}
                        {canManage && <Column header="Public page" body={publicBody} />}
                        <Column field="createdAt" header="Added" sortable body={(player) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(player.createdAt).slice(0, 10)}</span>} />
                        {canManage && <Column body={actionsBody} />}
                    </DataTable>
                )
            }

            {acrossClubs &&
                <PlayerClubsDialog
                    player={clubsPlayer}
                    memberships={clubsPlayer?.clubs ?? []}
                    targets={clubs}
                    onAdd={(clubId) => AdminService.addPlayerToClub(clubsPlayer.id, clubId)}
                    onRemove={(club) => AdminService.removePlayerFromClub(clubsPlayer.id, club.id)}
                    onHide={() => setClubsOfPlayerId(null)}
                    onChange={onClubsChange}
                    onError={showError}
                />
            }
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default PlayersTable;
