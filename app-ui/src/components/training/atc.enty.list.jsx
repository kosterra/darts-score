import { useRef } from 'react';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { DataView } from 'primereact/dataview';
import { Badge } from 'primereact/badge';

import dayjs from "dayjs";
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { formatTrainingTime } from '../../utils/training.time';

const ATCEntryList = (props) => {
    const {
        atcEntries,
        emptyMessage = 'No records found'
    } = props;

    const ds = useRef(null);

    const headerTemplate = () => {
        return (
            <div className="p-panel-header">
                <span className="p-panel-title">
                    <span>Around the Clock</span>
                    <span className="text-faint fs-8 fw-normal">Scoreboard</span>
                </span>
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
        const player = entry.player ?? {};
        const fullName = [player.firstname, player.lastname].filter(Boolean).join(' ');
        return (
            <div className="col-12" key={entry.id}>
                <div className={`row bg-surface-raised m-3 p-3 ${hasBorder(entry.createdAt) ? 'border border-gold border-2' : ''}`}>
                    <div className="col-7 col-sm-6">
                        <div className="d-flex align-items-center text-default fs-7 fw-semibold">
                            <Avatar
                                label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                image={resolvePlayerImg(player.profileImg)}
                                shape="circle"
                                className="avatar-md bg-surface-high m-2 me-3 flex-shrink-0"
                            />
                            <div className="d-flex flex-column justify-content-start align-items-start text-truncate">
                                <span className="text-default fw-semibold fs-6 text-truncate mw-100">{player.nickname || 'Unknown player'}</span>
                                {fullName && <span className="text-faint fs-7 text-truncate mw-100">{fullName}</span>}
                            </div>
                        </div>
                        <div className="fs-8 text-faint mt-2">{dayjs(entry.createdAt).format("DD.MM.YYYY HH:mm")}</div>
                    </div>
                    <div className="col-3 col-sm-4 d-flex align-items-center justify-content-center">
                        <span className="atc-entry-time">{formatTrainingTime(entry.timeMs)}</span>
                    </div>
                    <div className="col-2 d-flex align-items-center justify-content-end">
                        <Badge
                            value={index + 1}
                            size="xlarge"
                            severity="success"
                            className={['bg-gold', 'bg-silver', 'bg-bronze'][index] ?? ''}
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
                <span className="text-subtle fs-8 fw-normal">{emptyMessage}</span>
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