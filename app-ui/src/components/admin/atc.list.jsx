
import { useState, useEffect, useRef } from 'react';
import { DataView } from 'primereact/dataview';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';

import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import ATCService from '../../services/atc.service';
import DeletePopup from '../elements/delete.popup';
import JSONViewer from '../elements/json.viewer';
import { resolvePlayerImg } from '../../utils/image.utils';
import { Tag } from 'primereact/tag';
import { SelectButton } from 'primereact/selectbutton';

const ATCEntryAdminList = (props) => {
    const {
        deleteActive = false,
        staticModeFilterValue = 2,
        rawActive = true,
        emptyMessage = 'No items found'
    } = props;

    const toast = useRef(null);

    const [atcEntries, setATCEntries] = useState([]);
    const [layout, setLayout] = useState('grid');
    const [modeFilterValue, setModeFilterValue] = useState(staticModeFilterValue);

    const modeFilterValues = [
        { name: 'Single', value: 1 },
        { name: 'Double', value: 2 },
        { name: 'Triple', value: 3 },
        { name: 'All', value: 4 }
    ];

    useEffect(() => {
        loadATCEntries();
    }, [modeFilterValue]);

    const onATCEntryDelete = async (entry) => {
        if (await ATCService.deleteATCEntry(entry.id)) {
            toast.current.show(
                {
                    severity: 'success',
                    summary: 'ATC entry deleted',
                    detail: 'Successfully deleted atc entry: ' + entry.id,
                    life: 3000
                }
            );
            loadATCEntries();
        } else {
            toast.current.show(
                {
                    severity: 'error',
                    summary: 'ATC entry deleted',
                    detail: 'Error on deleting atc entry: ' + entry.id + '. Please try again or contact your system administrator',
                    life: 3000
                }
            );
        }
    };

    const loadATCEntries = async () => {
        let mode = modeFilterValues.filter(item => item.value == modeFilterValue)[0];
        let data = await ATCService.loadATCEntries(mode.name);
        setATCEntries(data);
    };

    const getSeverity = (mode) => {
        switch (mode) {
            case 'Single':
                return 'info';
            case 'Double':
                return 'warning';
            case 'Triple':
                return 'danger';
            default:
                return 'success';
        }
    }

    const listItem = (entry, index) => {
        return (
            <div className="col-12" key={'list-item-' + index}>
                <Panel className="panel-brighter-bg">
                    <div className="container-fluid overflow-hidden">
                        <div className="row mb-3">
                            <div className="d-flex justify-content-start align-items-center gap-3">
                                <span className="fs-5 text-shade100 fw-semibold">
                                    Around the clock
                                </span>
                                <Tag
                                    severity={getSeverity(entry.mode)}
                                    value={entry.mode}
                                    rounded
                                />
                            </div>
                        </div>
                        <div className="row gy-4">
                            <div className="col-12 col-md-8">
                                <div className="d-flex justify-content-center justify-content-md-start align-items-center gap-4">
                                    <Avatar
                                        label={(entry.player || {}).firstname || 'N' + ' ' + ((entry.player || {}).lastname || 'A').split(" ").map((n) => n[0]).join("")}
                                        image={resolvePlayerImg((entry.player || {}).profileImg)}
                                        shape="circle"
                                        className="avatar-lg bg-shade700 mx-3"
                                    />
                                    <div className="d-flex flex-column justify-content-start align-items-start">
                                        <span className="text-shade100 fw-semibold fs-5">{(entry.player || {}).nickname || 'N / A'}</span>
                                        <span className="text-shade600 fw-semibold fs-6">{((entry.player || {}).firstname || 'N') + ' ' + ((entry.player || {}).lastname || 'A')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-4 d-flex justify-content-center justify-content-md-end align-items-center gap-2">
                                {rawActive &&
                                    <JSONViewer data={entry} header="ATC Entry _RAW Data" />
                                }
                                {deleteActive &&
                                    <DeletePopup
                                        data={entry}
                                        header="Delete ATC Entry"
                                        message={'entry ' + entry.id}
                                        handleDelete={onATCEntryDelete}
                                    />
                                }
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        );
    };

    const gridItem = (entry, index) => {
        return (
            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={'grid-item-' + index}>
                <Panel className="panel-brighter-bg no-header">
                    <div className="row mb-3">
                        <div className="d-flex justify-content-start align-items-center gap-3">
                            <span className="fs-5 text-shade100 fw-semibold">
                                Around the clock
                            </span>
                            <Tag
                                severity={getSeverity(entry.mode)}
                                value={entry.mode}
                                rounded
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center">
                            <Avatar
                                label={(entry.player || {}).firstname || 'N' + ' ' + ((entry.player || {}).lastname || 'A').split(" ").map((n) => n[0]).join("")}
                                image={resolvePlayerImg((entry.player || {}).profileImg)}
                                shape="circle"
                                className="avatar-lg bg-shade700 mt-4"
                            />
                            <span className="text-shade100 fw-semibold fs-5 mt-4">{(entry.player || {}).nickname || 'N / A'}</span>
                            <span className="text-shade600 fw-semibold fs-6 mb-4">{((entry.player || {}).firstname || 'N') + ' ' + ((entry.player || {}).lastname || 'A')}</span>
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="d-flex justify-content-end gap-2 mt-2">
                            {rawActive &&
                                <JSONViewer data={entry} header="ATC Entry _RAW Data" />
                            }
                            {deleteActive &&
                                <DeletePopup
                                    data={entry}
                                    header="Delete ATC Entry"
                                    message={'entry ' + entry.id}
                                    handleDelete={onATCEntryDelete}
                                />
                            }
                        </div>
                    </div>
                </Panel>
            </div>
        );
    };

    const itemTemplate = (entry, layout, index) => {
        if (!entry) {
            return;
        }

        if (layout === 'list') {
            return listItem(entry, index);
        } else if (layout === 'grid') {
            return gridItem(entry, index);
        }
    };

    const listTemplate = (atcEntries, layout) => {
        return (
            <div className="container-fluid overflow-hidden">
                <div className="row gy-4 p-4">
                    {atcEntries.map((entry, index) => itemTemplate(entry, layout, index))}
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
                            <SelectButton
                                value={modeFilterValue}
                                onChange={(e) => setModeFilterValue(e.value)}
                                optionLabel="name"
                                options={modeFilterValues}
                            />
                        </div>
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-center justify-content-center">
                        <span className="fw-semibold fs-4">Around the Clock Trainings</span>
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
                value={atcEntries}
                listTemplate={listTemplate}
                layout={layout}
                header={header()}
                paginator
                rows={8}
                emptyMessage={emptyMessage}
            />
            <Toast ref={toast} position="bottom-right" />
        </div>
    )
};

export default ATCEntryAdminList;