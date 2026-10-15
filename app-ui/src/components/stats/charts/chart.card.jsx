/**
 * Frame for one chart: a small heading and a line explaining what it shows.
 */
const ChartCard = ({ title, description, children, className = '' }) => (
    <section className={`chart-card bg-surface rounded-2 p-3 h-100 d-flex flex-column ${className}`}>
        <h3 className="fs-6 fw-semibold text-default m-0">{title}</h3>
        {description && <p className="text-faint fs-8 mt-1 mb-2">{description}</p>}
        <div className="flex-grow-1">{children}</div>
    </section>
);

export default ChartCard;
