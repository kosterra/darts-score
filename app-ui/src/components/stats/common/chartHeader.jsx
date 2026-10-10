// src/components/stats/common/ChartHeader.jsx
const ChartHeader = ({ title, subtitle }) => {
    return (
        <div className="p-panel-header">
            <div>
                <div className="text-center fs-6 fw-semibold">{title}</div>
                {subtitle && (
                    <div className="text-center fs-8 fw-medium">{subtitle}</div>
                )}
            </div>
        </div>
    );
};

export default ChartHeader;
