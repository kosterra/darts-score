import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { FaTrophy } from 'react-icons/fa6';

import AdminService from '../../services/admin.service';
import ATCService from '../../services/atc.service';
import X01TrainingService from '../../services/x01.training.service';
import RulesService from '../../services/rules.service';
import { trainingOf } from '../../rules/trainings';
import TypeFilter from '../elements/type.filter';
import GameTypeIcon from '../elements/game.type.icon';
import TrainingsOverview from './trainings.overview';
import { TRAINING_TYPE_GROUPS, typesFrom, typesText } from '../elements/type.groups';
import PlayerService from '../../services/player.service';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import useClubSelection from './use.club.selection';
import ActivityInsights from './activity.insights';
import { formatDateTime } from './admin.format';
import { formatScore, scoreOf } from '../../utils/atc.scoreboard';
import { TABLE_DEFAULTS, tableState, useUrlState } from '../../utils/use.url.state';
import { BOT_ID } from '../../utils/x01.bot';
import { t } from '../../utils/i18n';
import FilterPills from '../elements/filter.pills';

const WHOSE_OPTIONS = [
    { label: t('Everyone'), value: 'all', icon: 'pi pi-users' },
    { label: t('Mine'), value: 'mine', icon: 'pi pi-user' },
];
// "All" is itself a training mode (every segment), so the filter for every mode is called "Any"
const MODE_OPTIONS = [
    { label: t('Any'), value: 'any' },
    ...['Single', 'Double', 'Triple', 'All'].map(mode => ({ label: t(mode), value: mode })),
];

// a training against the bot as a row: { kind, id, createdAt, club, player, what, won, legs, averages }
const x01Row = (training) => {
    const human = training.players.find(id => id !== BOT_ID);
    const own = training.playerModels?.[human] ?? {};
    const bot = training.playerModels?.[BOT_ID] ?? {};
    return {
        kind: 'x01',
        id: training.id,
        createdAt: training.createdAt,
        club: training.club,
        player: training.player,
        what: `${training.startingScore} ${training.legOutMode}`,
        finished: Boolean(training.hasWinner),
        won: Boolean(own.hasWonGame),
        legs: `${own.legsWon?.game ?? 0}–${bot.legsWon?.game ?? 0}`,
        averages: [own.averages?.game?.overall, bot.averages?.game?.overall],
        raw: training,
    };
};
const atcRow = (entry) => ({ ...entry, kind: 'atc', what: entry.mode, raw: entry });
// Bob's 27, 121 Checkout, … : the kind is the training, "what" its options
const rulesRow = (entry) => {
    const definition = trainingOf(entry.kind);
    return {
        ...entry,
        rules: definition,
        what: (definition?.options ?? []).map(option => option.values.find(value => value.value === entry.settings?.[option.key])?.label).filter(Boolean).join(' · ') || '–',
        raw: entry,
    };
};

/**
 * The trainings in one table: Around the Clock and X01 against the bot,
 * filtered by type, mode and player, each player's best time per mode marked.
 * scope "club": the selected club's trainings (those its players keep to
 * themselves only for them and the admins); players delete their own, admins
 * inspect and delete all. scope "all": the trainings of the clubs a global
 * admin picks, with their club.
 */
const TrainingsTable = ({ scope = 'club' }) => {
    const toast = useRef(null);
    const navigate = useNavigate();
    const { isClubAdmin, user } = useAuth();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;
    const [rows, setRows] = useState(null);
    const [players, setPlayers] = useState([]);
    // the filters, page and order live in the address: back from a training, the list is as it was left
    const [view, setView] = useUrlState({ type: 'all', mode: 'any', player: '', whose: 'all', ...TABLE_DEFAULTS });
    const { mode, whose } = view;
    // the kinds of training chosen, none for all
    const types = useMemo(() => typesFrom(view.type, TRAINING_TYPE_GROUPS), [view.type]);
    const withAtc = !types.length || types.includes('atc');
    const playerId = view.player || null;
    const setTypes = (values) => setView({ type: typesText(values), page: 1 });
    const setMode = (value) => setView({ mode: value, page: 1 });
    const setPlayerId = (value) => setView({ player: value ?? '', page: 1 });
    const setWhose = (value) => setView({ whose: value, page: 1 });

    const loadRows = async () => {
        if (acrossClubs && !selectedIds.length) {
            setRows([]);
            setPlayers([]);
            return;
        }
        try {
            const [atc, x01, rules, loadedPlayers] = await Promise.all(acrossClubs
                ? [AdminService.loadTrainings(selectedIds), AdminService.loadX01Trainings(selectedIds), AdminService.loadRulesTrainings(selectedIds), AdminService.loadPlayers(selectedIds)]
                : [ATCService.loadATCEntries(), X01TrainingService.loadTrainings(), RulesService.loadTrainings(), PlayerService.searchPlayers('')]);
            setRows([...(atc ?? []).map(atcRow), ...(x01 ?? []).map(x01Row), ...(rules ?? []).filter(entry => trainingOf(entry.kind)).map(rulesRow)]);
            setPlayers(loadedPlayers);
        } catch (error) {
            setRows([]);
            toast.current.show({ severity: 'error', summary: t('Load trainings'), detail: error.message, life: 4000 });
        }
    };

    useEffect(() => {
        loadRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acrossClubs, selectedIds]);

    // the player as they are now; an Around the Clock entry keeps only the id and the nickname
    const playersById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
    const playerOf = (row) => playersById.get(row.player?.id) ?? row.player;

    // each player's best time per mode is marked with a trophy
    const bestIds = useMemo(() => {
        const best = new Map();
        (rows ?? []).filter(row => row.kind === 'atc').forEach(entry => {
            // times and fewest darts each have their own best
            const key = `${entry.player?.id}-${entry.mode}-${entry.scoring === 'Darts' ? 'darts' : 'time'}`;
            if (scoreOf(entry) && (!best.has(key) || scoreOf(entry) < scoreOf(best.get(key)))) best.set(key, entry);
        });
        // the trainings of the rules engine: the best per player and kind
        (rows ?? []).filter(row => row.rules).forEach(entry => {
            const key = `${entry.player?.id}-${entry.kind}`;
            const known = best.get(key);
            const higher = entry.rules.higherIsBetter !== false;
            if (!known || (higher ? entry.score > known.score : entry.score < known.score)) best.set(key, entry);
        });
        return new Set([...best.values()].map(entry => entry.id));
    }, [rows]);

    // the user's own players, for "Mine"
    const isMine = (row) => Boolean(user) && playerOf(row)?.user === user.id;
    const hasOwn = !acrossClubs && players.some(player => user && player.user === user.id);

    const visibleRows = useMemo(() => (rows ?? [])
        .filter(row => whose === 'all' || isMine(row))
        .filter(row => !types.length || types.includes(row.kind))
        .filter(row => row.kind !== 'atc' || mode === 'any' || row.mode === mode)
        .filter(row => !playerId || row.player?.id === playerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, types, mode, playerId, whose, playersById, user]);

    // admins delete every training, the players their own
    const mayDelete = (row) => canManage || isMine(row);

    const onDelete = async (row) => {
        const clubId = acrossClubs ? row.club?.id : undefined;
        try {
            const deleted = row.rules
                ? await RulesService.deleteTraining(row.id, clubId)
                : row.kind === 'x01'
                    ? await X01TrainingService.deleteTraining(row.id, clubId)
                    : await ATCService.deleteATCEntry(row.id, clubId);
            if (!deleted) throw new Error(t('The training could not be deleted. Please try again.'));
            toast.current.show({ severity: 'success', summary: t('Training deleted'), life: 3000 });
            await loadRows();
        } catch (error) {
            toast.current.show({ severity: 'error', summary: t('Delete training'), detail: error.message, life: 4000 });
        }
    };

    const typeBody = (row) => (
        <span className="d-flex align-items-center gap-3">
            <GameTypeIcon type={row.rules ? row.kind : row.kind === 'x01' ? 'bot' : 'atc'} />
            <span className="text-default fs-7 text-nowrap">{row.rules ? row.rules.title : row.kind === 'x01' ? t('X01 against the bot') : t('Around the Clock')}</span>
        </span>
    );
    const whatBody = (row) => <span className="text-subtle fs-7 text-nowrap">{row.what}</span>;
    const resultBody = (row) => row.rules
        ? (
            <span className="text-default fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.rules.format(row.score)}
                {bestIds.has(row.id) && <FaTrophy className="ms-2 text-gold" title={t('Personal best')} aria-label={t('Personal best')} />}
            </span>
        )
        : row.kind === 'atc'
        ? (
            <span className="text-default fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatScore(row)}
                {bestIds.has(row.id) && <FaTrophy className="ms-2 text-gold" title={t('Personal best in this mode')} aria-label={t('Personal best')} />}
            </span>
        )
        : (
            <span className="d-flex flex-column">
                <span className="text-default fw-semibold text-nowrap">{row.finished ? `${row.won ? t('Won') : t('Lost')} ${row.legs}` : t('Running {{legs}}', { legs: row.legs })}</span>
                {row.averages[0] != null && <span className="text-faint fs-8 text-nowrap">{row.averages[0].toFixed(1)}{' '}{t('against the bot\'s')}{' '}{row.averages[1]?.toFixed(1) ?? '–'}</span>}
            </span>
        );

    // the player filter offers the players who have trained
    const playerOptions = useMemo(() => {
        const ids = new Set((rows ?? []).map(row => row.player?.id));
        return players.filter(player => ids.has(player.id));
    }, [rows, players]);

    const needsClubs = acrossClubs && !selectedIds.length;

    const actionsBody = (row) => (
        <div className="row-actions">
            {row.kind === 'x01' && (!acrossClubs || !row.club) && row.finished &&
                <Button type="button" icon="pi pi-chart-bar" severity="secondary" aria-label={t('The statistics of this training')} title={t('Statistics')} onClick={() => navigate(`/stats/training/x01/${row.id}`)} />}
            {canManage && <JSONViewer data={row.raw} header={t('Training _RAW Data')} />}
            {mayDelete(row) && <DeletePopup data={row} header={t('Delete Training')} message={t('this training and the badges earned in it')} handleDelete={onDelete} />}
        </div>
    );

    return (
        <>
        {/* the club's trainings at a glance, above the list */}
        {!acrossClubs && rows && <TrainingsOverview rows={rows} playerOf={playerOf} />}
        {/* across clubs: every club at a glance, a club picked there shows in the list */}
        {acrossClubs && <ActivityInsights what="trainings" onPickClub={(id) => select([id])} />}
        <Panel id="admin-list" header={acrossClubs ? t('Trainings of all clubs') : t('Trainings')}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                {hasOwn && <FilterPills value={whose} options={WHOSE_OPTIONS} onChange={setWhose} ariaLabel={t('Whose trainings')} />}
                <TypeFilter groups={TRAINING_TYPE_GROUPS} value={types} onChange={setTypes} allLabel={t('All trainings')} ariaLabel={t('Training')} />
                {withAtc && <FilterPills value={mode} options={MODE_OPTIONS} onChange={setMode} ariaLabel={t('Mode of Around the Clock')} />}
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
                {!needsClubs && <span className="ms-auto text-faint fs-7">{visibleRows.length} {visibleRows.length === 1 ? t('training') : t('trainings')}</span>}
            </AdminToolbar>

            {needsClubs
                ? <ChooseClubsHint what="trainings" />
                : (
                    <DataTable
                        value={visibleRows}
                        dataKey="id"
                        className="admin-table"
                        loading={rows === null}
                        {...tableState(view, setView, { sortField: 'createdAt' })}
                        emptyMessage={t('No trainings match these filters.')}
                        responsiveLayout="scroll"
                    >
                        <Column field="createdAt" header={t('Date')} sortable body={(row) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(row.createdAt)}</span>} />
                        {acrossClubs && <Column field="club.name" header={t('Club')} sortable body={(row) => <ClubCell club={row.club} />} />}
                        <Column header={t('Player')} body={(row) => <PlayerCell player={playerOf(row)} />} style={{ minWidth: '14rem' }} />
                        <Column header={t('Training')} body={typeBody} />
                        <Column header={t('Played')} body={whatBody} />
                        <Column header={t('Result')} body={resultBody} />
                        <Column body={actionsBody} />
                    </DataTable>
                )
            }

            <Toast ref={toast} position="bottom-right" />
        </Panel>
        </>
    );
};

export default TrainingsTable;
