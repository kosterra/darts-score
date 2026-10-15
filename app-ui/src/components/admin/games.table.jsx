import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { FaTrophy, FaChartColumn } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';

import AdminService from '../../services/admin.service';
import PlayerService from '../../services/player.service';
import X01Service from '../../services/x01.service';
import CricketService from '../../services/cricket.service';
import EliminationService from '../../services/elimination.service';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import GameStatusTag from '../elements/game.status.tag';
import GameTypeTag from '../elements/game.type.tag';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import { formatDateTime } from './admin.format';
import useClubSelection from './use.club.selection';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

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
        describe: () => ({ title: 'Cricket' }),
        score: (model) => `${model.score ?? 0} points`,
    },
    elimination: {
        load: () => EliminationService.loadAllEliminationGames(),
        remove: (id, clubId) => EliminationService.deleteEliminationGame(id, clubId),
        describe: (game) => ({ title: `Target ${game.targetScore}` }),
        score: (model) => `${model.score ?? 0} points`,
    },
};

const TYPE_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'X01', value: 'x01' },
    { label: 'Cricket', value: 'cricket' },
    { label: 'Elimination', value: 'elimination' },
];

const STATUS_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Running', value: 'running' },
    { label: 'Finished', value: 'finished' },
];

/**
 * Games in one table, filtered by type, status and player.
 * scope "club": the selected club's games; everyone can open them, its admins also inspect and delete.
 * scope "all": games of the clubs a global admin picks, with the club of each game.
 */
const GamesTable = ({ scope = 'club', initialType = 'all' }) => {
    const toast = useRef(null);
    const { activeClub, isClubAdmin } = useAuth();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;

    const [games, setGames] = useState(null);
    const [players, setPlayers] = useState([]);
    const [type, setType] = useState(initialType);
    const [status, setStatus] = useState('all');
    const [playerId, setPlayerId] = useState(null);
    const [selection, setSelection] = useState([]);

    useEffect(() => setType(initialType), [initialType]);

    const loadClubGames = async () => {
        const loaded = await Promise.all(Object.entries(GAME_TYPES).map(async ([gameType, config]) =>
            (await config.load()).map(game => ({ ...game, type: gameType }))));
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
        } catch (error) {
            setGames([]);
            toast.current.show({ severity: 'error', summary: 'Load games', detail: error.message, life: 4000 });
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

    const visibleGames = useMemo(() => (games ?? [])
        .filter(game => type === 'all' || game.type === type)
        .filter(game => status === 'all' || (status === 'running') === !!game.gameIsRunning)
        .filter(game => !playerId || game.players.includes(playerId)),
    [games, type, status, playerId]);

    // a selection only ever holds games that are still shown
    useEffect(() => {
        setSelection(selected => selected.filter(game => visibleGames.includes(game)));
    }, [visibleGames]);

    const deleteGames = async (toDelete) => {
        const results = await Promise.all(toDelete.map(game =>
            GAME_TYPES[game.type].remove(game.id, acrossClubs ? game.club?.id : undefined).catch(() => false)));
        const failed = results.filter(ok => !ok).length;
        if (failed) {
            toast.current.show({ severity: 'error', summary: 'Delete games', detail: `${plural(failed, 'game')} could not be deleted. Please try again.`, life: 4000 });
        } else {
            toast.current.show({ severity: 'success', summary: toDelete.length === 1 ? 'Game deleted' : 'Games deleted', detail: plural(toDelete.length, 'game'), life: 3000 });
        }
        setSelection([]);
        await loadGames();
    };

    const confirmDeleteSelection = () => confirmDialog({
        header: 'Delete games',
        message: `Are you sure you want to delete ${plural(selection.length, 'game')}?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Delete',
        rejectLabel: 'Cancel',
        acceptClassName: 'p-button-danger p-button-sm',
        rejectClassName: 'p-button-secondary p-button-sm',
        accept: () => deleteGames(selection),
    });

    const gameBody = (game) => {
        const { title, detail } = GAME_TYPES[game.type].describe(game);
        return (
            <div className="d-flex flex-column align-items-start gap-1">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <GameTypeTag type={game.type} />
                    <span className="text-default fs-7 fw-semibold">{title}</span>
                </div>
                {detail && <span className="text-faint fs-8">{detail}</span>}
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
                            {model.hasWonGame && <FaTrophy className="ms-2 text-gold" aria-label="Winner" />}
                        </PlayerCell>
                        <span className="text-subtle fs-8 text-nowrap">{GAME_TYPES[game.type].score(model, game)}</span>
                    </div>
                );
            })}
        </div>
    );

    // games open in the club the app works in, so across clubs only that club's games link there
    const canOpen = (game) => !acrossClubs || game.club?.id === activeClub?.id;

    const actionsBody = (game) => (
        <div className="row-actions">
            {canOpen(game) && (game.gameIsRunning
                ? <Link to={`/${game.type}/${game.id}`} className="row-action-link" title="Continue playing" aria-label="Continue playing"><GiDart /></Link>
                : <Link to={`/stats/games/${game.type}/${game.id}`} className="row-action-link" title="Show statistics" aria-label="Show statistics"><FaChartColumn /></Link>
            )}
            {canManage && <JSONViewer data={game} header="Game _RAW Data" />}
            {canManage && <DeletePopup data={game} header="Delete Game" message="this game" handleDelete={(g) => deleteGames([g])} />}
        </div>
    );

    const needsClubs = acrossClubs && !selectedIds.length;

    return (
        <Panel header={acrossClubs ? 'Games of all clubs' : 'Games'}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <SelectButton value={type} options={TYPE_OPTIONS} onChange={(e) => e.value && setType(e.value)} aria-label="Game type" />
                <SelectButton value={status} options={STATUS_OPTIONS} onChange={(e) => e.value && setStatus(e.value)} aria-label="Status" />
                <Dropdown
                    value={playerId}
                    options={playerOptions}
                    optionLabel="nickname"
                    optionValue="id"
                    onChange={(e) => setPlayerId(e.value)}
                    placeholder="All players"
                    filter
                    showClear
                    aria-label="Player"
                    style={{ minWidth: '12rem' }}
                />
                <div className="ms-auto d-flex align-items-center gap-3">
                    {!needsClubs && <span className="text-faint fs-7">{plural(visibleGames.length, 'game')}</span>}
                    {canManage &&
                        <Button
                            label={selection.length ? `Delete ${selection.length}` : 'Delete'}
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
                        sortField="createdAt"
                        sortOrder={-1}
                        paginator
                        rows={15}
                        rowsPerPageOptions={[15, 30, 60]}
                        emptyMessage="No games match these filters."
                        responsiveLayout="scroll"
                    >
                        {canManage && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                        <Column field="createdAt" header="Date" sortable body={(game) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(game.createdAt)}</span>} />
                        {acrossClubs && <Column field="club.name" header="Club" sortable body={(game) => <ClubCell club={game.club} />} />}
                        <Column header="Game" body={gameBody} />
                        <Column header="Players" body={playersBody} style={{ minWidth: '16rem' }} />
                        <Column header="Status" body={(game) => <GameStatusTag running={game.gameIsRunning} />} />
                        <Column body={actionsBody} />
                    </DataTable>
                )
            }

            <ConfirmDialog />
            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default GamesTable;
