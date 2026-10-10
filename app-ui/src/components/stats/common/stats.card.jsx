import { Panel } from 'primereact/panel';
import ChartHeader from '@/components/stats/common/chartHeader';

const StatsCard = ({ title, subtitle, value, subvalue, className = '' }) => {
    return (
        <Panel
            headerTemplate={() => <ChartHeader title={title} subtitle={subtitle} />}
            className={`h-100 bg-shade900 ${className}`}
        >
            <div className="d-flex flex-column align-items-center p-1 pt-3">
                <span className="text-shade100 fs-1">{value}</span>
                <span className="text-shade500 text-center fs-7 fw-semibold">
                    {subvalue}
                </span>
            </div>
        </Panel>
    );
};

export default StatsCard;
