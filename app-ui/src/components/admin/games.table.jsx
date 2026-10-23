import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { FaTrophy, FaChartColumn } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';

import AdminService from '../../services/admin.service';
import PlayerService from '../../services/player.service';
import X01Service from '../../services/x01.service';
import CricketService from '../../services/cricket.service';
import EliminationService from '../../services/elimination.service';
import ClockService from '../../services/clock.service';
import RulesService from '../../services/rules.service';
import { GAMES as RULES_GAMES } from '../../rules/games';
import { playPath } from '../../utils/game.paths';
import { replayGame } from '../../rules/engine';
import DeletionRequestService from '../../services/deletion.request.service';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import GameStatusTag from '../elements/game.status.tag';
import GameTypeTag from '../elements/game.type.tag';
import GameTypeIcon from '../elements/game.type.icon';
import GamesOverview from './games.overview';
import TypeFilter from '../elements/type.filter';
import { GAME_TYPE_GROUPS, typesFrom, typesText } from '../elements/type.groups';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import { formatDateTime } from './admin.format';
import useClubSelection from './use.club.selection';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { AskDeletionDialog, DeletionRequestDialog } from './deletion.request.dialogs';
import { t } from '../../utils/i18n';
import FilterPills from '../elements/filter.pills';

// "3 games" in the language of the app (the word in English, as the key of its texts)
const plural = (count, word) => t(count === 1 ? `{{count}} ${word}` : `{{count}} ${word}s`, { count });

// How each game type is loaded (for the selected club), described, scored and deleted
const GAME_TYPES = {
    x01: {
        load: () => X01Service.loadAllX01Games(),
        remove: (id, clubId) => X01Service.deleteX01Game(id, clubId),
        describe: (game) => ({
            title: `${game.startingScore} · ${game.setMode} ${plural(game.numberOfSets, 'set')} · ${game.legMode} ${plural(game.numberOfLegs, 'leg')}`,
            detail: `${game.legInMode} / ${game.legOutMode}`,
        }),
        score: (model, game) => game.gameIsRunning
            ? `${plural(model.setsWon ?? 0, 'set')} · ${plural(model.currentSetLegsWon ?? 0, 'leg')}`
            : plural(model.setsWon ?? 0, 'set'),
    },
    cricket: {
        load: () => CricketService.loadAllCricketGames(),
        remove: (id, clubId) => CricketService.deleteCricketGame(id, clubId),
        describe: () => ({ title: t('Cricket') }),
        score: (model) => t('{{value}} points', { value: model.score ?? 0 }),
    },
    elimination: {
        load: () => EliminationService.loadAllEliminationGames(),
        remove: (id, clubId) => EliminationService.deleteEliminationGame(id, clubId),
        describe: (game) => ({ title: t('Target {{targetScore}}', { targetScore: game.targetScore }) }),
        score: (model) => t('{{value}} points', { value: model.score ?? 0 }),
    },
    clock: {
        load: () => ClockService.loadAllClockGames(),
        remove: (id, clubId) => ClockService.deleteClockGame(id, clubId),
        describe: (game) => ({ title: t('Around the Clock · {{value}}', { value: t(game.mode ?? 'All') }) }),
        score: (model) => model.finished ? t('{{value}} darts', { value: model.darts ?? 0 }) : t('{{value}} of 21', { value: model.target ?? 0 }),
    },
    // Shanghai, Killer, … : loaded together, each game typed by its kind
    rules: {
        load: () => RulesService.loadAllGames(),
    },
    ...Object.fromEntries(RULES_GAMES.map(definition => [definition.id, {
        remove: (id, clubId) => RulesService.deleteGame(id, clubId),
        describe: (game) => ({
            title: [definition.title, ...(definition.options ?? []).map(option => option.values.find(value => value.value === game.settings?.[option.key])?.label).filter(Boolean)].join(' · '),
        }),
        // what its chart follows, e.g. the points, the strokes or the lives
        score: (model, game, playerId) => {
            const { state } = replayOf(definition, game);
            return state.players[playerId] ? `${definition.progress.label} ${definition.progress.value(state.players[playerId], state)}` : '';
        },
    }])),
};

// a game replayed once for all its rows
const replays = new WeakMap();
const replayOf = (definition, game) => {
    if (!replays.has(game)) replays.set(game, replayGame(definition, game));
    return replays.get(game);
};


const STATUS_OPTIONS = [
    { label: t('All'), value: 'all' },
    { label: t('Running'), value: 'running', icon: 'pi pi-play' },
    { label: t('Finished'), value: 'finished', icon: 'pi pi-check-circle' },
];
// in a club: also the games someone asked to delete
const CLUB_STATUS_OPTIONS = [...STATUS_OPTIONS, { label: t('Deletion asked'), value: 'requested', icon: 'pi pi-flag' }];

// what the user may do about deleting their games, in the toasts
const DONE = {
    agreed: t('You agreed to delete the game.'),
    declined: t('You declined to delete the game.'),
    withdrawn: t('Your request was taken back.'),
    kept: t('The game stays.'),
};

/**
 * Games in one table, filtered by type, status and player.
 * scope "club": the selected club's games; everyone can open them, its admins also inspect and delete.
 * The players of a game ask to delete it; the others agree, the admins decide (see deletion.request.dialogs).
 * scope "all": games of the clubs a global admin picks, with the club of each game.
 */
const GamesTable = ({ scope = 'club', initialType = 'all', initialPlayerId = null }) => {
    const toast = useRef(null);
    const { activeClub, isClubAdmin, user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;

    const [games, setGames] = useState(null);
    const [players, setPlayers] = useState([]);
    // the filters, page and order live in the address: back from a game, the list is as it was left
    const [view, setView] = useUrlState({ type: initialType, status: 'all', player: initialPlayerId ?? '', ...TABLE_DEFAULTS });
    const { status } = view;
    // the game types chosen, none for all
    const types = useMemo(() => typesFrom(view.type, GAME_TYPE_GROUPS), [view.type]);
    const playerId = view.player || null;
    const setTypes = (values) => setView({ type: typesText(values), page: 1 });
    const setStatus = (value) => setView({ status: value, page: 1 });
    const setPlayerId = (value) => setView({ player: value ?? '', page: 1 });
    const [selection, setSelection] = useState([]);
    // the open requests to delete a game, by game id; the game asked about and the request shown
    const [requests, setRequests] = useState(new Map());
    const [asking, setAsking] = useState(null);
    const [shownRequest, setShownRequest] = useState(null);


    const loadClubGames = async () => {
        const loaded = await Promise.all(Object.entries(GAME_TYPES).filter(([, config]) => config.load).map(async ([gameType, config]) =>
            (await config.load()).map(game => ({ ...game, type: gameType === 'rules' ? game.kind : gameType }))));
        return loaded.flat();
    };

    const loadGames = async () => {
        if (acrossClubs && !selectedIds.length) {
            setGames([]);
            setPlayers([]);
            return;
        }
        setGames(null);
        try {
            const [loadedGames, loadedPlayers] = await Promise.all(acrossClubs
                ? [AdminService.loadGames(selectedIds), AdminService.loadPlayers(selectedIds)]
                : [loadClubGames(), PlayerService.searchPlayers('', { includeGuests: true })]);
            setGames(loadedGames.map(game => ({ ...game, key: `${game.type}-${game.id}` })));
            setPlayers(loadedPlayers);
            if (!acrossClubs) await loadRequests();
        } catch (error) {
            setGames([]);
            toast.current.show({ severity: 'error', summary: t('Load games'), detail: error.message, life: 4000 });
        }
    };

    const loadRequests = async () => {
        try {
            const open = await DeletionRequestService.loadOpen();
            setRequests(new Map(open.map(request => [request.game, request])));
        } catch {
            setRequests(new Map());
        }
    };

    // a notification leads here with ?deletion=<request>: show it, open or decided
    const linkedRequest = searchParams.get('deletion');
    useEffect(() => {
        if (!linkedRequest || acrossClubs) return;
        DeletionRequestService.loadRequest(linkedRequest)
            .then(setShownRequest)
            .catch(error => toast.current.show({ severity: 'error', summary: t('Request to delete a game'), detail: error.message, life: 4000 }));
    }, [linkedRequest, acrossClubs]);

    const closeRequest = () => {
        setShownRequest(null);
        if (linkedRequest) {
            searchParams.delete('deletion');
            setSearchParams(searchParams, { replace: true });
        }
    };

    useEffect(() => {
        loadGames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acrossClubs, selectedIds]);

    const playersById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);

    // the player filter offers the players who appear in the loaded games
    const playerOptions = useMemo(() => {
        const ids = new Set((games ?? []).flatMap(game => game.players));
        return players.filter(player => ids.has(player.id));
    }, [games, players]);

    // each row carries its open request, so the table redraws it when one comes or goes
    const visibleGames = useMemo(() => (games ?? [])
        .map(game => requests.has(game.id) || game.deletion ? { ...game, deletion: requests.get(game.id) ?? null } : game)
        .filter(game => !types.length || types.includes(game.type))
        .filter(game => status === 'all' || (status === 'requested' ? Boolean(game.deletion) : (status === 'running') === !!game.gameIsRunning))
        .filter(game => !playerId || game.players.includes(playerId)),
    [games, types, status, playerId, requests]);

    // a selection only ever holds games that are still shown
    useEffect(() => {
        setSelection(selected => selected.filter(game => visibleGames.some(shown => shown.key === game.key)));
    }, [visibleGames]);

    const deleteGames = async (toDelete) => {
        const results = await Promise.all(toDelete.map(game =>
            GAME_TYPES[game.type].remove(game.id, acrossClubs ? game.club?.id : undefined).catch(() => false)));
        const failed = results.filter(ok => !ok).length;
        if (failed) {
            toast.current.show({ severity: 'error', summary: t('Delete games'), detail: t('{{plural}} could not be deleted. Please try again.', { plural: plural(failed, 'game') }), life: 4000 });
        } else {
            toast.current.show({ severity: 'success', summary: toDelete.length === 1 ? t('Game deleted') : t('Games deleted'), detail: plural(toDelete.length, 'game'), life: 3000 });
        }
        setSelection([]);
        await loadGames();
    };

    const confirmDeleteSelection = () => confirmDialog({
        header: t('Delete games'),
        message: t('Are you sure you want to delete {{plural}}?', { plural: plural(selection.length, 'game') }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('Delete'),
        rejectLabel: t('Cancel'),
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => deleteGames(selection),
    });

    const gameBody = (game) => {
        const { title, detail } = GAME_TYPES[game.type].describe(game);
        return (
            // the type at a glance: its round badge in its colour, as on the dashboard
            <div className="d-flex align-items-center gap-3">
                <GameTypeIcon type={game.type} />
                <div className="d-flex flex-column align-items-start gap-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <GameTypeTag type={game.type} />
                        <span className="text-default fs-7 fw-semibold">{title}</span>
                    </div>
                    {detail && <span className="text-faint fs-8">{detail}</span>}
                </div>
            </div>
        );
    };

    const playersBody = (game) => (
        <div className="d-flex flex-column gap-2">
            {game.players.map(id => {
                const model = game.playerModels?.[id] ?? {};
                return (
                    <div key={id} className="d-flex align-items-center justify-content-between gap-3">
                        <PlayerCell player={playersById.get(id)}>
                            {model.hasWonGame && <FaTrophy className="ms-2 text-gold" aria-label={t('Winner')} />}
                        </PlayerCell>
                        <span className="text-subtle fs-8 text-nowrap">{GAME_TYPES[game.type].score(model, game, id)}</span>
                    </div>
                );
            })}
        </div>
    );

    // the user's own players: they may ask to delete the games they played
    const myPlayerIds = useMemo(() => new Set(players.filter(player => user && player.user === user.id).map(player => player.id)), [players, user]);
    const mayAsk = (game) => !acrossClubs && !canManage && !game.deletion && game.players.some(id => myPlayerIds.has(id));

    const titleOf = (game) => game && GAME_TYPES[game.type].describe(game).title;
    const showError = (detail) => toast.current.show({ severity: 'error', summary: t('Delete a game'), detail, life: 4000 });

    const onAsked = async (request) => {
        setAsking(null);
        toast.current.show({
            severity: 'success',
            summary: request.status === 'deleted' ? t('Game deleted') : t('Asked to delete the game'),
            detail: request.status === 'deleted' ? t('You played it alone, so it went at once.') : t('The other players and the club admins are asked.'),
            life: 4000,
        });
        await loadGames();
    };

    const onRequestChanged = async (request, what) => {
        closeRequest();
        const deleted = request.status === 'deleted';
        toast.current.show({ severity: 'success', summary: deleted ? t('Game deleted') : t('Request to delete a game'), detail: deleted ? (what === 'agreed' ? t('Every player agreed, so the game was deleted.') : t('The game was deleted with the badges earned in it.')) : DONE[what], life: 4000 });
        await loadGames();
    };

    // games open in the club the app works in, so across clubs only that club's games link there
    const canOpen = (game) => !acrossClubs || game.club?.id === activeClub?.id;

    const actionsBody = (game) => (
        <div className="row-actions">
            {canOpen(game) && (game.gameIsRunning
                ? <Link to={playPath(game.type, game.id)} className="row-action-link" title={t('Continue playing')} aria-label={t('Continue playing')}><GiDart /></Link>
                : <Link to={`/stats/games/${game.type}/${game.id}`} className="row-action-link" title={t('Show statistics')} aria-label={t('Show statistics')}><FaChartColumn /></Link>
            )}
            {game.deletion &&
                <Button type="button" icon="pi pi-flag" severity="danger" aria-label={t('The request to delete this game')} title={t('Request to delete')} onClick={() => setShownRequest(game.deletion)} />}
            {mayAsk(game) &&
                <Button type="button" icon="pi pi-flag" severity="secondary" aria-label={t('Ask to delete this game')} title={t('Ask to delete')} onClick={() => setAsking(game)} />}
            {canManage && <JSONViewer data={game} header={t('Game _RAW Data')} />}
            {canManage && <DeletePopup data={game} header={t('Delete Game')} message={t('this game')} handleDelete={(g) => deleteGames([g])} />}
        </div>
    );

    const needsClubs = acrossClubs && !selectedIds.length;

    const statusBody = (game) => {
        const request = game.deletion;
        return (
            <div className="d-flex flex-column align-items-start gap-1">
                <GameStatusTag running={game.gameIsRunning} />
                {request && <Tag severity="danger" value={t('Deletion asked · {{agreed}} of {{total}}', { agreed: request.agreed, total: request.total })} />}
            </div>
        );
    };

    return (
        <>
        {/* the club's games at a glance, above the list */}
        {!acrossClubs && <GamesOverview />}
        <Panel header={acrossClubs ? t('Games of all clubs') : t('Games')}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <TypeFilter groups={GAME_TYPE_GROUPS} value={types} onChange={setTypes} allLabel={t('All game types')} ariaLabel={t('Game type')} />
                <FilterPills value={status} options={acrossClubs ? STATUS_OPTIONS : CLUB_STATUS_OPTIONS} onChange={setStatus} ariaLabel={t('Status')} />
                <Dropdown
                    value={playerId}
                    options={playerOptions}
                    optionLabel="nickname"
                    optionValue="id"
                    onChange={(e) => setPlayerId(e.value)}
                    placeholder={t('All players')}
                    filter
                    showClear
                    aria-label={t('Player')}
                    style={{ minWidth: '12rem' }}
                />
                <div className="ms-auto d-flex align-items-center gap-3">
                    {!needsClubs && <span className="text-faint fs-7">{plural(visibleGames.length, 'game')}</span>}
                    {canManage &&
                        <Button
                            label={selection.length ? t('Delete {{length}}', { length: selection.length }) : t('Delete')}
                            icon="pi pi-trash"
                            severity="danger"
                            size="small"
                            disabled={!selection.length}
                            onClick={confirmDeleteSelection}
                        />
                    }
                </div>
            </AdminToolbar>

            {needsClubs
                ? <ChooseClubsHint what="games" />
                : (
                    <DataTable
                        value={visibleGames}
                        dataKey="key"
                        className="admin-table"
                        loading={games === null}
                        selectionMode={canManage ? 'checkbox' : null}
                        selection={selection}
                        onSelectionChange={(e) => setSelection(e.value)}
                        {...tableState(view, setView, { sortField: 'createdAt' })}
                        emptyMessage={t('No games match these filters.')}
                        responsiveLayout="scroll"
                    >
                        {canManage && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                        <Column field="createdAt" header={t('Date')} sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.createdAt)}</span>} />
                        {acrossClubs && <Column field="club.name" header={t('Club')} sortable body={(game) => <ClubCell club={game.club} />} />}
                        <Column header={t('Game')} body={gameBody} />
                        <Column header={t('Players')} body={playersBody} style={{ minWidth: '16rem' }} />
                        <Column header={t('Status')} body={statusBody} />
                        <Column body={actionsBody} />
                    </DataTable>
                )
            }

            <AskDeletionDialog game={asking} title={titleOf(asking)} onHide={() => setAsking(null)} onAsked={onAsked} onError={showError} />
            <DeletionRequestDialog
                request={shownRequest}
                canDecide={isClubAdmin}
                onHide={closeRequest}
                onChanged={onRequestChanged}
                onError={showError}
            />
            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default GamesTable;
