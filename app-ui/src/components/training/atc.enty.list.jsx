import { useRef } from 'react';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { DataView } from 'primereact/dataview';
import { Badge } from 'primereact/badge';

import dayjs from "dayjs";
import { resolvePlayerImg } from '../../utils/image.utils';

const ATCEntryList = (props) => {
    const {
        atcEntries,
        emptyMessage = 'No records found'
    } = props;

    const ds = useRef(null);

    const headerTemplate = () => {
        return (
            <div className="p-panel-header" >
                <div>
                    <div className="text-center fs-6 fw-semibold">Around the Clock</div>
                    <div className="text-center fs-8 fw-medium">Scoreboard</div>
                </div>
            </div>
        );
    };

    const hasBorder = (date) => {
        let isToday = dayjs().isSame(dayjs(date), 'day');
        let isLatest = false;
        let latest = atcEntries.reduce((a, b) => {
            return new Date(a.createdAt) > new Date(b.createdAt) ? a : b;
        });
        isLatest = new Date(latest.createdAt).getTime() === new Date(date).getTime();

        return isToday && isLatest;
    }

    const itemTemplate = (entry, index) => {
        return (
            <div className="col-12" key={entry.id}>
                <div className={`row bg-shade800 m-3 p-3 ${hasBorder(entry.createdAt) ? 'border border-gold border-2' : ''}`}>
                    <div className="col-3">
                        <div className="d-flex align-items-center text-shade100 fs-7 fw-semibold">
                            <Avatar
                                label={(entry.player || {}).firstname || 'N' + ' ' + ((entry.player || {}).lastname || 'A').split(" ").map((n) => n[0]).join("")}
                                image={resolvePlayerImg((entry.player || {}).profileImg)}
                                shape="circle"
                                size="large"
                                className="bg-shade700 m-2 me-4"
                            />
                            <div className="d-flex flex-column justify-content-start align-items-start">
                                <span className="text-shade100 fw-semibold fs-6">{(entry.player || {}).nickname || 'N / A'}</span>
                                <span className="text-shade600 fs-7">{((entry.player || {}).firstname || 'N') + ' ' + ((entry.player || {}).lastname || 'A')}</span>
                            </div>
                        </div>
                        <div className="d-flex align-self-bottom justify-content-between align-items-end mt-4">
                            <span className="fs-8 text-shade500">{dayjs(entry.createdAt).format("DD.MM.YYYY HH:mm")}</span>
                        </div>
                    </div>
                    <div className="col-6 d-flex align-items-center justify-content-center">
                        <span className="fw-semibold fs-4">{entry.hours}</span>
                        <span className="fw-semibold fs-6 ms-1 me-3">Hr</span>
                        <span className="fw-semibold fs-4">{entry.minutes.toString().padStart(2, "0")}</span>
                        <span className="fw-semibold fs-6 ms-1 me-3">Min</span>
                        <span className="fw-semibold fs-4">{entry.seconds.toString().padStart(2, "0")}</span>
                        <span className="fw-semibold fs-6 ms-1 me-3">Sec</span>
                        <span className="fw-semibold fs-4">{entry.milliseconds.toString().padStart(2, "0")}</span>
                    </div>
                    <div className="col-3 d-flex align-items-center justify-content-end fs-1">
                        <Badge
                            value={index + 1}
                            size="xlarge"
                            severity="success"
                            className={index + 1 == 1 ? 'bg-gold' : (index + 1 == 2 ? 'bg-silver': (index + 1 == 3 ? 'bg-bronze' : ''))}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const listTemplate = (items) => {
        if (!items || items.length === 0) return null;

        let list = items.map((product, index) => {
            return itemTemplate(product, index);
        });

        return <div className="grid grid-nogutter">{list}</div>;
    };

    const emptyMessageTemplate = () => {
        return (
            <div>
                <span className="text-shade400 fs-8 fw-normal">{emptyMessage}</span>
            </div>
        );
    };


    return (
        <div className="col-12">
            <Panel headerTemplate={headerTemplate} className="mx-auto" >
                <DataView ref={ds} value={atcEntries} listTemplate={listTemplate} emptyMessage={emptyMessageTemplate()} rows={10} paginator />
            </Panel>
        </div>
    );
};

export default ATCEntryList;