import { Fragment, useEffect, useState, useRef } from 'react';
import { Avatar } from 'primereact/avatar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { FilterMatchMode, FilterOperator } from 'primereact/api';

import PlayerService from '../../services/player.service';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import PlayerForm from '../elements/player.form';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';

const PlayersTable = (props) => {
    const {
        deleteActive = false,
        rawActive = true,
        emptyMessage = 'No items found'
    } = props;

    const toast = useRef(null);

    const [players, setPlayers] = useState([]);
    const [playerToDelete, setPlayerToDelete] = useState({});
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        nickname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        firstname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        lastname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
    });

    useEffect(() => {
        loadPlayers('');
    }, []);

    const handlePlayerEdit = () => {
        loadPlayers('');
    };

    const onPlayerAdd = () => {
        loadPlayers('');
    }

    const loadPlayers = async searchTerm => {
        let data = await PlayerService.searchPlayers(searchTerm);
        setPlayers(data);
    }

    const imageBodyTemplate = (player) => {
        return (
            <div className="d-flex justify-content-center">
                <Avatar
                    label={resolvePlayerInitials(player.firstname, player.lastname)}
                    image={resolvePlayerImg(player.profileImg)}
                    shape="circle"
                    className="avatar-lg"
                />
            </div>
        );
    };

    const actionsTemplate = (player) => {
        return (
            <div className="d-flex justify-content-end gap-2">
                <PlayerForm
                    onPlayerEdit={handlePlayerEdit}
                    edit={true}
                    updatePlayer={player}
                />
                {rawActive &&
                    <JSONViewer data={player} header="Player _RAW Data" />
                }
                {deleteActive &&
                    <DeletePopup
                        data={player}
                        header="Delete Player"
                        message={'player ' + player.nickname}
                        handleDelete={confirmDelete}
                    />
                }
            </div>
        );
    };

    const onGlobalFilterChange = (event) => {
        const value = event.target.value;
        let _filters = { ...filters };

        _filters['global'].value = value;

        setFilters(_filters);
    };

    const renderHeader = () => {
        const value = filters['global'] ? filters['global'].value : '';

        return (
            <div className="row">
                <div className="col-4 align-items-center justify-content-center">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            type="search" value={value || ''}
                            onChange={(e) => onGlobalFilterChange(e)}
                            placeholder="Global Search"
                            className="bg-surface-raised"
                        />
                    </span>
                </div>
                <div className="col-4 d-flex align-items-center justify-content-center">
                    <span className="text-default fs-5 fw-semibold">Players</span>
                </div>
                <div className="col-4 d-flex align-items-center justify-content-end">
                    <PlayerForm onPlayerAdd={onPlayerAdd} />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    const accept = async () => {
        if (playerToDelete && playerToDelete.id) {
            await PlayerService.deletePlayer(playerToDelete.id)
            setPlayerToDelete({});
            toast.current.show(
                {
                    severity: 'success',
                    summary: 'Player deleted',
                    detail: 'Successfully deleted player: ' + playerToDelete.nickname,
                    life: 3000
                }
            );
            loadPlayers('');
        } else {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Player deleted',
                    detail: 'Error on deleting player: ' + playerToDelete.nickname + '. Please try again or contact your system administrator',
                    life: 3000
                }
            );
        }
    };

    const reject = () => {
        setPlayerToDelete({});
    };

    const confirmDelete = (player) => {
        setPlayerToDelete(player);
        confirmDialog({
            group: 'templating',
            header: 'Confirmation',
            message: (
                <div className="d-flex flex-column align-items-center gap-3 border-bottom-1">
                    <i className="pi pi-exclamation-circle text-6xl text-primary-500"></i>
                    <span>Are you sure you want to delete this player?</span>
                </div>
            ),
            accept,
            reject
        });
    };

    return (
        <Fragment>
            <Toast ref={toast} position="bottom-right" />
            <ConfirmDialog group="templating" />
            <DataTable
                value={players}
                header={header}
                stripedRows
                sortField="nickname"
                sortOrder={1}
                filters={filters}
                onFilter={(e) => setFilters(e.filters)}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                emptyMessage={emptyMessage}
            >
                <Column
                    header=""
                    body={imageBodyTemplate}
                />
                <Column
                    field="nickname"
                    header="Nickname"
                    sortable
                    filter
                    filterPlaceholder="Search"
                />
                <Column
                    field="firstname"
                    header="Firstname"
                    sortable
                    filter
                    filterPlaceholder="Search"
                />
                <Column
                    field="lastname"
                    header="Lastname"
                    sortable
                    filter
                    filterPlaceholder="Search"
                />
                <Column
                    header="Actions"
                    body={actionsTemplate}
                />
            </DataTable>
        </Fragment>
    );
}

export default PlayersTable;