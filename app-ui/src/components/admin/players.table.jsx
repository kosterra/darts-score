import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
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
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import { formatDateTime } from './admin.format';
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
    const { isClubAdmin } = useAuth();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;

    const [players, setPlayers] = useState(null);
    // levels exist per club, so only the club's own list shows them
    const [levels, setLevels] = useState({});

    useEffect(() => {
        if (!acrossClubs) StatsService.loadPlayerLevels().then(setLevels).catch(() => setLevels({}));
    }, [acrossClubs]);
    const [search, setSearch] = useState('');
    const [kind, setKind] = useState('all');

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
        if (await PlayerService.deletePlayer(player.id, acrossClubs ? player.club?.id : undefined)) {
            toast.current.show({ severity: 'success', summary: 'Player deleted', detail: player.nickname, life: 3000 });
            await loadPlayers();
        } else {
            showError('Delete player', { message: `${player.nickname} could not be deleted. Please try again.` });
        }
    };

    const kindBody = (player) => player.guest
        ? <Tag value="Guest" severity="secondary" />
        : <Tag value="Member" severity="success" />;

    const loginBody = (player) => player.user
        ? <span className="text-default fs-7"><i className="pi pi-key text-primary me-2" aria-hidden="true" />Has a login</span>
        : <span className="text-faint fs-7">–</span>;

    const publicBody = (player) => player.guest
        ? <span className="text-faint fs-7">–</span>
        : <span className={player.publicProfile ? 'text-default fs-7' : 'text-faint fs-7'}>{player.publicProfile ? 'Nickname shown' : 'Hidden'}</span>;

    // the club's own admins look after their players; across clubs a global admin inspects and deletes
    const actionsBody = (player) => !canManage ? null : (
        <div className="row-actions">
            {!acrossClubs && <>
                <PlayerForm onPlayerEdit={loadPlayers} edit={true} updatePlayer={player} />
                {player.guest
                    ? <Button type="button" icon="pi pi-user-plus" severity="secondary" aria-label={`Make ${player.nickname} a club member`} tooltip="Make club member" tooltipOptions={{ position: 'top' }} onClick={() => onMakeMember(player)} />
                    : <>
                        <PlayerLogin player={player} onChange={loadPlayers} />
                        <Button
                            type="button"
                            icon={player.publicProfile ? 'pi pi-eye' : 'pi pi-eye-slash'}
                            severity={player.publicProfile ? undefined : 'secondary'}
                            aria-label={player.publicProfile ? `Hide the nickname of ${player.nickname} on the public page` : `Show the nickname of ${player.nickname} on the public page`}
                            tooltip={player.publicProfile ? 'Nickname is public' : 'Nickname is hidden publicly'}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => onTogglePublic(player)}
                        />
                    </>
                }
            </>}
            <JSONViewer data={player} header="Player _RAW Data" />
            <DeletePopup data={player} header="Delete Player" message={'player ' + player.nickname} handleDelete={onDelete} />
        </div>
    );

    const needsClubs = acrossClubs && !selectedIds.length;

    return (
        <Panel header={acrossClubs ? 'Players of all clubs' : 'Players'}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players" aria-label="Search players" />
                </IconField>
                <SelectButton value={kind} options={KIND_OPTIONS} onChange={(e) => e.value && setKind(e.value)} aria-label="Members or guests" />
                <div className="ms-auto d-flex align-items-center gap-3">
                    {!needsClubs && <span className="text-faint fs-7">{visiblePlayers.length} {visiblePlayers.length === 1 ? 'player' : 'players'}</span>}
                    {!acrossClubs && isClubAdmin && <PlayerForm onPlayerAdd={loadPlayers} />}
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
                        sortField="nickname"
                        sortOrder={1}
                        paginator
                        rows={15}
                        rowsPerPageOptions={[15, 30, 60]}
                        emptyMessage={players?.length ? 'No players match these filters.' : 'No players yet.'}
                        responsiveLayout="scroll"
                    >
                        <Column
                            field="nickname"
                            header="Player"
                            sortable
                            // in the club's own list the name opens the player's profile
                            body={(player) => acrossClubs
                                ? <PlayerCell player={player} />
                                : <Link to={`/players/${player.id}`} className="player-link"><PlayerCell player={player} /></Link>}
                            style={{ minWidth: '14rem' }}
                        />
                        {acrossClubs && <Column field="club.name" header="Club" sortable body={(player) => <ClubCell club={player.club} />} />}
                        {!acrossClubs && <Column header="Level" body={(player) => player.guest ? <span className="text-faint fs-7">–</span> : <LevelBadge level={levels[player.id]} />} />}
                        <Column header="Type" body={kindBody} />
                        {canManage && <Column header="Login" body={loginBody} />}
                        {canManage && <Column header="Public page" body={publicBody} />}
                        <Column field="createdAt" header="Added" sortable body={(player) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(player.createdAt).slice(0, 10)}</span>} />
                        {canManage && <Column body={actionsBody} />}
                    </DataTable>
                )
            }

            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default PlayersTable;
