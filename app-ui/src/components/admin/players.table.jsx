import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import PlayerService from '../../services/player.service';
import StatsService from '../../services/stats.service';
import LevelBadge from '../players/level.badge';
import usePlayerForm from '../elements/player.form';
import PlayerClubsEditor from './player.clubs.editor';
import PlayersOverview from './players.overview';
import PlayersInsights from './players.insights';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import { formatDate } from '../../utils/dates';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import useClubSelection from './use.club.selection';
import { VisitLink } from './visit.club';
import { t } from '../../utils/i18n';
import { TableLoading } from '../elements/skeletons';
import FilterPills from '../elements/filter.pills';

const KIND_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Members'), value: 'members', icon: 'pi pi-id-card' },
    { label: t('Guests'), value: 'guests', icon: 'pi pi-user-plus' },
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
            showError(t('Load players'), error);
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
            showError(t('Public nickname'), error);
        }
    };

    const onMakeMember = async (player) => {
        try {
            await PlayerService.makeMember(player.id);
            await loadPlayers();
        } catch (error) {
            showError(t('Make club member'), error);
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
            toast.current.show({ severity: 'success', summary: leftClub ? t('Player removed from the club') : t('Player deleted'), detail: player.nickname, life: 3000 });
            await loadPlayers();
        } catch {
            showError(t('Delete player'), { message: t('{{nickname}} could not be deleted. Please try again.', { nickname: player.nickname }) });
        }
    };

    // a player was added across clubs: show the club they were added to
    const onPlayerAdded = async (clubId) => {
        if (clubId && !selectedIds.includes(clubId)) select([...selectedIds, clubId]);
        else await loadPlayers();
    };
    // a new player: the form opens below the toolbar
    const [newPlayerButton, newPlayerForm] = usePlayerForm(acrossClubs
        ? { onPlayerAdd: onPlayerAdded, clubs, defaultClubId: selectedIds[0], label: t('New player') }
        : { onPlayerAdd: loadPlayers });

    const onClubsChange = async (summary) => {
        toast.current.show({ severity: 'success', summary, detail: players?.find(player => player.id === clubsOfPlayerId)?.nickname, life: 3000 });
        await loadPlayers();
    };

    const clubsPlayer = players?.find(player => player.id === clubsOfPlayerId) ?? null;

    const kindBody = (player) => player.guest
        ? <Tag value={t('Guest')} severity="secondary" />
        : <Tag value={t('Member')} severity="secondary" />;

    const loginBody = (player) => player.user
        ? <span className="text-default fs-7"><i className="pi pi-key text-primary me-2" aria-hidden="true" />{t('Has a login')}</span>
        // nothing to tell: left out on a phone
        : <span className="text-faint fs-7 empty-cell">–</span>;

    const publicBody = (player) => player.guest
        ? <span className="text-faint fs-7">–</span>
        : (
            // on a phone both on one line (see admin-public-page)
            <span className="admin-public-page">
                <span className={player.publicProfile ? 'text-default fs-7' : 'text-faint fs-7'}>{player.publicProfile ? t('Nickname shown') : t('Hidden')}</span>
                {decidesThemselves(player) && <span className="text-faint fs-8 admin-public-page-who">{t('their own choice')}</span>}
            </span>
        );

    // the club's own admins look after their players; across clubs a global admin inspects and deletes
    const actionsBody = (player) => !canManage ? null : (
        <div className="row-actions">
            {!acrossClubs && <>
                <Button type="button" icon="pi pi-user-edit" aria-label={t('Edit {{nickname}}', { nickname: player.nickname })} tooltip={t('Edit player')} tooltipOptions={{ position: 'top' }} onClick={() => navigate(`/players/${player.id}/edit`)} />
                {player.guest
                    ? <Button type="button" icon="pi pi-user-plus" severity="secondary" aria-label={t('Make {{nickname}} a club member', { nickname: player.nickname })} tooltip={t('Make club member')} tooltipOptions={{ position: 'top' }} onClick={() => onMakeMember(player)} />
                    : <>
                        {/* the login is given on the player's page, opened at it */}
                        <Button
                            type="button"
                            icon="pi pi-key"
                            severity={player.user ? 'primary' : 'secondary'}
                            aria-label={player.user ? t('Login of {{nickname}}', { nickname: player.nickname }) : t('Give {{nickname}} a login', { nickname: player.nickname })}
                            tooltip={player.user ? t('Has a login') : t('Give a login')}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => navigate(`/players/${player.id}/edit#login`)}
                        />
                        <Button
                            type="button"
                            icon={player.publicProfile ? 'pi pi-eye' : 'pi pi-eye-slash'}
                            severity={player.publicProfile ? undefined : 'secondary'}
                            aria-label={player.publicProfile ? t('Hide the nickname of {{nickname}} on the public page', { nickname: player.nickname }) : t('Show the nickname of {{nickname}} on the public page', { nickname: player.nickname })}
                            tooltip={decidesThemselves(player)
                                ? t('{{nickname}} has a login and decides this on their profile', { nickname: player.nickname })
                                : player.publicProfile ? t('Nickname is public') : t('Nickname is hidden publicly')}
                            tooltipOptions={{ position: 'top', showOnDisabled: true }}
                            disabled={decidesThemselves(player)}
                            onClick={() => onTogglePublic(player)}
                        />
                    </>
                }
            </>}
            {/* a club admin of several clubs finds the clubs of a player on the player's page */}
            {acrossClubs &&
                <Button type="button" icon="pi pi-building" severity="secondary" aria-label={t('Clubs of {{nickname}}', { nickname: player.nickname })} tooltip={t('Clubs: add to or remove from a club')} tooltipOptions={{ position: 'top' }} onClick={() => setClubsOfPlayerId(clubsOfPlayerId === player.id ? null : player.id)} />
            }
            <JSONViewer data={player} header={t('Player _RAW Data')} />
            <DeletePopup
                data={player}
                header={t('Delete Player')}
                message={acrossClubs && player.clubs?.length > 1
                    ? t('player {{nickname}} from all {{length}} clubs', { nickname: player.nickname, length: player.clubs.length })
                    : 'player ' + player.nickname}
                handleDelete={onDelete}
            />
        </div>
    );

    const needsClubs = acrossClubs && !selectedIds.length;

    return (
        <>
        {/* the club's players at a glance, above the list */}
        {!acrossClubs && <PlayersOverview players={players} levels={levels} canManage={canManage} />}
        {/* across clubs: every club at a glance, a club picked there shows in the list */}
        {acrossClubs && <PlayersInsights onPickClub={(id) => select([id])} />}
        <Panel id="admin-list" header={acrossClubs ? t('Players of all clubs') : t('Players')}>
            <AdminToolbar actions={<>
                    {!needsClubs && <span className="text-faint fs-7">{visiblePlayers.length} {visiblePlayers.length === 1 ? t('player') : t('players')}</span>}
                    {(acrossClubs || isClubAdmin) && newPlayerButton}
                </>} changed={[acrossClubs && selectedIds.length, view.search, view.kind !== 'all'].filter(Boolean).length} startOpen={needsClubs}>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search players')} aria-label={t('Search players')} />
                </span>
                <FilterPills label={t('Players')} value={kind} options={KIND_OPTIONS} onChange={setKind} ariaLabel={t('Members or guests')} />
            </AdminToolbar>
            {(acrossClubs || isClubAdmin) && newPlayerForm}

            {needsClubs
                ? <ChooseClubsHint what="players" />
                : (
                    <DataTable
                        value={visiblePlayers}
                        dataKey="id"
                        // the clubs of a player open under their row
                        expandedRows={acrossClubs && clubsPlayer ? { [clubsPlayer.id]: true } : null}
                        rowExpansionTemplate={(player) => (
                            <PlayerClubsEditor
                                player={player}
                                memberships={player?.clubs ?? []}
                                targets={clubs}
                                onAdd={(clubId) => AdminService.addPlayerToClub(player.id, clubId)}
                                onRemove={(club) => AdminService.removePlayerFromClub(player.id, club.id)}
                                onHide={() => setClubsOfPlayerId(null)}
                                onChange={onClubsChange}
                                onError={showError}
                            />
                        )}
                        className="admin-table"
                        {...tableState(view, setView, { sortField: 'nickname', sortOrder: 1 })}
                        emptyMessage={players === null ? <TableLoading /> : players?.length ? t('No players match these filters.') : t('No players yet.')}
                        responsiveLayout="stack" breakpoint="640px"
                    >
                        <Column
                            field="nickname"
                            header={t('Player')}
                            bodyClassName="no-label"
                            sortable
                            // the name opens the player's profile
                            body={(player) => {
                                // members still without a date of birth are marked for the club's admins
                                const missingBirth = canManage && !player.guest && !player.dateOfBirth && (
                                    <i className="pi pi-calendar-times text-warning ms-2 fs-8" title={t('No date of birth yet: edit the player to add it, it is needed for handicap suggestions')} aria-label={t('No date of birth yet')} />
                                );
                                if (!acrossClubs) return <Link to={`/players/${player.id}`} className="player-link"><PlayerCell player={player}>{missingBirth}</PlayerCell></Link>;
                                // across clubs: the profile as the admins of one of the chosen clubs see it
                                const club = (player.clubs ?? []).find(entry => selectedIds.includes(entry.id)) ?? player.clubs?.[0];
                                return club
                                    ? <VisitLink clubId={club.id} to={`/players/${player.id}`} className="player-link" title={t('Open the player in {{club}}', { club: club.name })} ariaLabel={null}><PlayerCell player={player}>{missingBirth}</PlayerCell></VisitLink>
                                    : <PlayerCell player={player}>{missingBirth}</PlayerCell>;
                            }}
                            style={{ minWidth: '14rem' }}
                        />
                        {acrossClubs && <Column bodyClassName="no-label" header={t('Clubs')} body={(player) => (
                            <div className="d-flex flex-column gap-1">
                                {(player.clubs ?? []).map(club => <ClubCell key={club.id} club={club} />)}
                            </div>
                        )} />}
                        {/* on a phone the level, the type and the login side by side, without names */}
                        {!acrossClubs && <Column header={t('Level')} bodyClassName="no-label inline-cell" body={(player) => player.guest ? <span className="text-faint fs-7 empty-cell">–</span> : <LevelBadge level={levels[player.id]} />} />}
                        <Column bodyClassName="no-label inline-cell" header={t('Type')} body={kindBody} />
                        {canManage && <Column bodyClassName="no-label inline-cell" header={t('Login')} body={loginBody} />}
                        {canManage && <Column header={t('Public page')} body={publicBody} />}
                        <Column field="createdAt" header={t('Added')} sortable body={(player) => <span className="text-subtle fs-7 text-nowrap">{formatDate(player.createdAt)}</span>} />
                        {canManage && <Column body={actionsBody} />}
                    </DataTable>
                )
            }

            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default PlayersTable;
