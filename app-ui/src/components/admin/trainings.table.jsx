import { useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { FaTrophy } from 'react-icons/fa6';

import AdminService from '../../services/admin.service';
import ATCService from '../../services/atc.service';
import PlayerService from '../../services/player.service';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { useAuth } from '../../utils/auth.context';
import { AdminToolbar, PlayerCell } from './admin.common';
import { ClubFilter, ClubCell, ChooseClubsHint } from './club.filter';
import useClubSelection from './use.club.selection';
import { formatDateTime } from './admin.format';

// "All" is itself a training mode (every segment), so the filter for every mode is called "Any"
const MODE_OPTIONS = [
    { label: 'Any', value: 'any' },
    ...['Single', 'Double', 'Triple', 'All'].map(mode => ({ label: mode, value: mode })),
];

// training times are stored in hundredths of a second
const formatTime = (hundredths) => {
    if (hundredths == null) return '–';
    const seconds = hundredths / 100;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
};

/**
 * Around the Clock trainings in one table, filtered by mode and player, with
 * each player's best time per mode marked.
 * scope "club": the selected club's trainings; its admins also inspect and delete.
 * scope "all": trainings of the clubs a global admin picks, with their club.
 */
const TrainingsTable = ({ scope = 'club' }) => {
    const toast = useRef(null);
    const { isClubAdmin } = useAuth();
    const acrossClubs = scope === 'all';
    const { clubs, selectedIds, select } = useClubSelection(acrossClubs);
    const canManage = acrossClubs || isClubAdmin;
    const [entries, setEntries] = useState(null);
    const [players, setPlayers] = useState([]);
    const [mode, setMode] = useState('any');
    const [playerId, setPlayerId] = useState(null);

    const loadEntries = async () => {
        if (acrossClubs && !selectedIds.length) {
            setEntries([]);
            setPlayers([]);
            return;
        }
        try {
            const [loadedEntries, loadedPlayers] = await Promise.all(acrossClubs
                ? [AdminService.loadTrainings(selectedIds), AdminService.loadPlayers(selectedIds)]
                : [ATCService.loadATCEntries(), PlayerService.searchPlayers('')]);
            setEntries(loadedEntries);
            setPlayers(loadedPlayers);
        } catch (error) {
            setEntries([]);
            toast.current.show({ severity: 'error', summary: 'Load trainings', detail: error.message, life: 4000 });
        }
    };

    useEffect(() => {
        loadEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acrossClubs, selectedIds]);

    // the player as they are now; the entry keeps a copy from when it was played
    const playersById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
    const playerOf = (entry) => playersById.get(entry.player?.id) ?? entry.player;

    // each player's best time per mode is marked with a trophy
    const bestIds = useMemo(() => {
        const best = new Map();
        (entries ?? []).forEach(entry => {
            const key = `${entry.player?.id}-${entry.mode}`;
            if (entry.timeMs && (!best.has(key) || entry.timeMs < best.get(key).timeMs)) best.set(key, entry);
        });
        return new Set([...best.values()].map(entry => entry.id));
    }, [entries]);

    const visibleEntries = useMemo(() => (entries ?? [])
        .filter(entry => mode === 'any' || entry.mode === mode)
        .filter(entry => !playerId || entry.player?.id === playerId),
    [entries, mode, playerId]);

    const onDelete = async (entry) => {
        if (await ATCService.deleteATCEntry(entry.id, acrossClubs ? entry.club?.id : undefined)) {
            toast.current.show({ severity: 'success', summary: 'Training deleted', life: 3000 });
            await loadEntries();
        } else {
            toast.current.show({ severity: 'error', summary: 'Delete training', detail: 'The training could not be deleted. Please try again.', life: 4000 });
        }
    };

    const timeBody = (entry) => (
        <span className="text-default fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(entry.timeMs)}
            {bestIds.has(entry.id) && <FaTrophy className="ms-2 text-gold" title="Personal best in this mode" aria-label="Personal best" />}
        </span>
    );

    // the player filter offers the players who have trained
    const playerOptions = useMemo(() => {
        const ids = new Set((entries ?? []).map(entry => entry.player?.id));
        return players.filter(player => ids.has(player.id));
    }, [entries, players]);

    const needsClubs = acrossClubs && !selectedIds.length;

    const actionsBody = (entry) => !canManage ? null : (
        <div className="row-actions">
            <JSONViewer data={entry} header="Training _RAW Data" />
            <DeletePopup data={entry} header="Delete Training" message="this training" handleDelete={onDelete} />
        </div>
    );

    return (
        <Panel header={acrossClubs ? 'Around the Clock trainings of all clubs' : 'Around the Clock trainings'}>
            <AdminToolbar>
                {acrossClubs && <ClubFilter clubs={clubs} selectedIds={selectedIds} onChange={select} />}
                <SelectButton value={mode} options={MODE_OPTIONS} onChange={(e) => e.value && setMode(e.value)} aria-label="Mode" />
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
                {!needsClubs && <span className="ms-auto text-faint fs-7">{visibleEntries.length} {visibleEntries.length === 1 ? 'training' : 'trainings'}</span>}
            </AdminToolbar>

            {needsClubs
                ? <ChooseClubsHint what="trainings" />
                : (
                    <DataTable
                        value={visibleEntries}
                        dataKey="id"
                        className="admin-table"
                        loading={entries === null}
                        sortField="createdAt"
                        sortOrder={-1}
                        paginator
                        rows={15}
                        rowsPerPageOptions={[15, 30, 60]}
                        emptyMessage="No trainings match these filters."
                        responsiveLayout="scroll"
                    >
                        <Column field="createdAt" header="Date" sortable body={(entry) => <span className="text-subtle fs-7 text-nowrap">{formatDateTime(entry.createdAt)}</span>} />
                        {acrossClubs && <Column field="club.name" header="Club" sortable body={(entry) => <ClubCell club={entry.club} />} />}
                        <Column header="Player" body={(entry) => <PlayerCell player={playerOf(entry)} />} style={{ minWidth: '14rem' }} />
                        <Column field="mode" header="Mode" sortable body={(entry) => <span className="text-default fs-7">{entry.mode}</span>} />
                        <Column field="timeMs" header="Time" sortable body={timeBody} />
                        {canManage && <Column body={actionsBody} />}
                    </DataTable>
                )
            }

            <Toast ref={toast} position="bottom-right" />
        </Panel>
    );
};

export default TrainingsTable;
