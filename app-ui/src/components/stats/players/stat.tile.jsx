/**
 * One figure on the player statistics page, in the style of the dashboard numbers.
 */
const StatTile = ({ label, value, detail }) => (
    <div className="stat-tile bg-surface rounded-2 p-3 h-100 text-center">
        <div className="fs-2 fw-semibold text-default tabular-nums">{value}</div>
        <div className="text-subtle fs-7">{label}</div>
        {detail && <div className="text-faint fs-8 mt-1">{detail}</div>}
    </div>
);

export default StatTile;
