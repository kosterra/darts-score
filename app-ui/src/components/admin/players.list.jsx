
import { useState, useEffect, useRef } from 'react';
import { DataView } from 'primereact/dataview';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import PlayerService from '../../services/player.service';
import PlayerForm from '../elements/player.form';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';

const PlayersList = (props) => {
    const {
        deleteActive = false,
        rawActive = true,
        emptyMessage = 'No items found'
    } = props;

    const toast = useRef(null);

    const [players, setPlayers] = useState([]);
    const [layout, setLayout] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState('firstname');
    const [sortOrder, setSortOrder] = useState(1);
    const [sortField, setSortField] = useState('firstname');
    const sortOptions = [
        { label: 'Firstname A-Z', value: 'firstname' },
        { label: 'Firstname Z-A', value: '!firstname' },
        { label: 'Lastname A-Z', value: 'lastname' },
        { label: 'Lastname Z-A', value: '!lastname' },
        { label: 'Nickname A-Z', value: 'nickname' },
        { label: 'Nickname Z-A', value: '!nickname' },
    ];

    useEffect(() => {
        loadPlayers('');
    }, []);

    const onSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
        loadPlayers(event.target.value);
    }

    const onSortChange = (event) => {
        const value = event.value;

        if (value.indexOf('!') === 0) {
            setSortOrder(-1);
            setSortField(value.substring(1, value.length));
            setSortKey(value);
        } else {
            setSortOrder(1);
            setSortField(value);
            setSortKey(value);
        }
    };

    const onPlayerAdd = () => {
        setSearchTerm('');
        loadPlayers('');
        setSortOrder(1);
        setSortField('firstname');
        setSortKey('firstname');
    };

    const onPlayerEdit = () => {
        loadPlayers('');
    };

    const onPlayerDelete = async (player) => {
        if (await PlayerService.deletePlayer(player.id)) {
            toast.current.show(
                {
                    severity: 'success',
                    summary: 'Player deleted',
                    detail: 'Successfully deleted player: ' + player.nickname,
                    life: 3000
                }
            );
            loadPlayers('');
        } else {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'Player deleted',
                    detail: 'Error on deleting player: ' + player.nickname + '. Please try again or contact your system administrator',
                    life: 3000
                }
            );
        }
    };

    const loadPlayers = async (searchTerm) => {
        let data = await PlayerService.searchPlayers(searchTerm);
        setPlayers(data);
    };

    const listItem = (player, index) => {
        return (
            <div className="col-12" key={'list-item-' + index}>
                <Panel className="panel-brighter-bg">
                    <div className="container-fluid overflow-hidden">
                        <div className="row gy-4">
                            <div className="col-12 col-md-8">
                                <div className="d-flex justify-content-center justify-content-md-start align-items-center gap-4">
                                    <Avatar
                                        label={resolvePlayerInitials(player.firstname, player.lastname)}
                                        image={resolvePlayerImg(player.profileImg)}
                                        shape="circle"
                                        className="avatar-lg bg-shade700 mx-3"
                                    />
                                    <div className="d-flex flex-column justify-content-start align-items-start">
                                        <span className="text-shade100 fw-semibold fs-5">{player.nickname}</span>
                                        <span className="text-shade600 fw-semibold fs-6">{player.firstname + ' ' + player.lastname}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-4 d-flex justify-content-center justify-content-md-end align-items-center gap-2">
                                <PlayerForm
                                    key={'player-form-' + index}
                                    onPlayerEdit={onPlayerEdit}
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
                                        handleDelete={onPlayerDelete}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        );
    };

    const gridItem = (player, index) => {
        return (
            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={'grid-item-' + index}>
                <Panel className="panel-brighter-bg no-header">
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center">
                            <Avatar
                                label={resolvePlayerInitials(player.firstname, player.lastname)}
                                image={resolvePlayerImg(player.profileImg)}
                                shape="circle"
                                className="avatar-xl bg-shade700 mt-4"
                            />
                            <span className="text-shade100 fw-semibold fs-5 mt-4">{player.nickname}</span>
                            <span className="text-shade600 fw-semibold fs-6 mb-4">{player.firstname + ' ' + player.lastname}</span>
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="d-flex justify-content-end gap-2 mt-2">
                            <PlayerForm
                                onPlayerEdit={onPlayerEdit}
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
                                    handleDelete={onPlayerDelete}
                                />
                            }
                        </div>
                    </div>
                </Panel>
            </div>
        );
    };

    const itemTemplate = (player, layout, index) => {
        if (!player) {
            return;
        }

        if (layout === 'list') {
            return listItem(player, index);
        } else if (layout === 'grid') {
            return gridItem(player, index);
        }
    };

    const listTemplate = (players, layout) => {
        return (
            <div className="container-fluid overflow-hidden">
                <div className="row gy-4 p-4">
                    {players.map((player, index) => itemTemplate(player, layout, index))}
                </div>
            </div>
        );
    };

    const header = () => {
        return (
            <div className="container-fluid overflow-hidden">
                <div className="row gy-2">
                    <div className="col-12 col-md-4">
                        <div className="d-flex flex-sm-row align-items-center justify-content-start flex-wrap gap-3 p-2">
                            <span className="p-input-icon-left">
                                <i className="pi pi-search" />
                                <InputText
                                    type="search" value={searchTerm || ''}
                                    onChange={(e) => onSearchTermChange(e)}
                                    placeholder="Global Search"
                                />
                            </span>
                            <Dropdown
                                options={sortOptions}
                                value={sortKey}
                                optionLabel="label"
                                placeholder="Sort List"
                                onChange={onSortChange}
                                className="w-auto"
                            />
                            <PlayerForm onPlayerAdd={onPlayerAdd} />
                        </div>
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-center justify-content-center">
                        <span className="fw-semibold fs-4">Players</span>
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-center justify-content-start justify-content-md-end mb-2 mb-lg-0">
                        <div className="d-flex gap-1">
                            <Button icon="pi pi-list" onClick={() => setLayout('list')} outlined={layout !== 'list'} />
                            <Button icon="pi pi-th-large" onClick={() => setLayout('grid')} outlined={layout !== 'grid'} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card">
            <DataView
                value={players}
                listTemplate={listTemplate}
                layout={layout}
                header={header()}
                sortField={sortField}
                sortOrder={sortOrder}
                paginator
                rows={8}
                emptyMessage={emptyMessage}
            />
            <Toast ref={toast} position="bottom-right" />
        </div>
    )
};

export default PlayersList;