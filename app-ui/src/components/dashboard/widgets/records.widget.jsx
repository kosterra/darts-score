import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { FaStopwatch, FaCrosshairs, FaFire, FaChartLine } from 'react-icons/fa6';
import dayjs from 'dayjs';

import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

const RECORDS = [
    { key: 'bestLeg', label: t('Best 501 leg'), icon: FaStopwatch, format: (value) => t('{{value}} darts', { value: value }) },
    { key: 'highestCheckout', label: t('Highest checkout'), icon: FaCrosshairs, format: (value) => value },
    { key: 'most180sInGame', label: t('Most 180s in a game'), icon: FaFire, format: (value) => `${value} × 180` },
    { key: 'bestGameAverage', label: t('Best game average'), icon: FaChartLine, format: (value) => value.toFixed(1) },
];

/**
 * The club's X01 records, each with who holds it and when it was set.
 */
const RecordsWidget = ({ widget, records, players }) => (
    <Panel header={widget.title} className="h-100">
        <div className="records-grid">
            {RECORDS.map(({ key, label, icon: Icon, format }) => {
                const record = records[key];
                const player = record ? players.get(record.player) : null;
                return (
                    <div key={key} className="record-card">
                        <span className="record-icon" aria-hidden="true"><Icon /></span>
                        <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span className="text-faint fs-8">{label}</span>
                            <span className="record-value">{record ? format(record.value) : '–'}</span>
                            {record &&
                                <span className="d-flex align-items-center gap-2 mt-1" style={{ minWidth: 0 }}>
                                    <Avatar
                                        label={resolvePlayerInitials(player?.firstname, player?.lastname)}
                                        image={resolvePlayerImg(player?.profileImg)}
                                        shape="circle"
                                        className="avatar-xs bg-surface-high flex-shrink-0"
                                    />
                                    <Link to={`/players/${record.player}`} className="text-default fs-8 fw-semibold text-truncate">{player?.nickname ?? t('Unknown')}</Link>
                                    <Link to={`/stats/games/x01/${record.gameId}`} className="text-faint fs-9 text-nowrap">{dayjs(record.date).format('DD.MM.YYYY')}</Link>
                                </span>
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    </Panel>
);

export default RecordsWidget;
