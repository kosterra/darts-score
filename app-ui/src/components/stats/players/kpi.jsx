// Building blocks for a player's key figures: a ring for rates, a big
// number for averages and small chips for counts. "color" is the colour of
// the game type, so X01, Cricket and Elimination are told apart at a glance.

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A rate as a ring that fills up, with the percentage in the middle.
 */
export const KpiRing = ({ label, part, whole, color, detail }) => {
    const ratio = whole ? Math.min(1, part / whole) : 0;
    return (
        <div className="kpi-ring" style={{ '--kpi-color': color }}>
            <svg viewBox="0 0 100 100" role="img" aria-label={`${label}: ${whole ? Math.round(ratio * 100) : 0} %`}>
                <circle className="kpi-ring-track" cx="50" cy="50" r={RADIUS} />
                <circle
                    className="kpi-ring-value"
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    style={{ '--kpi-dash': CIRCUMFERENCE, '--kpi-offset': CIRCUMFERENCE * (1 - ratio) }}
                />
                <text x="50" y="50" className="kpi-ring-text">{whole ? `${Math.round(ratio * 100)}%` : '–'}</text>
            </svg>
            <span className="kpi-label">{label}</span>
            {detail && <span className="kpi-detail">{detail}</span>}
        </div>
    );
};

/**
 * One headline number, like an average.
 */
export const KpiHero = ({ label, value, detail, color }) => (
    <div className="kpi-hero" style={{ '--kpi-color': color }}>
        <span className="kpi-hero-value">{value ?? '–'}</span>
        <span className="kpi-label">{label}</span>
        {detail && <span className="kpi-detail">{detail}</span>}
    </div>
);

/**
 * A small figure with an icon, and optionally a line under it ("detail"),
 * e.g. who it was and when.
 */
export const KpiChip = ({ icon: Icon, label, value, color, detail }) => (
    <div className="kpi-chip" style={{ '--kpi-color': color }}>
        <span className="kpi-chip-icon" aria-hidden="true"><Icon /></span>
        <span className="d-flex flex-column min-w-0">
            <span className="kpi-chip-value">{value ?? '–'}</span>
            <span className="kpi-chip-label">{label}</span>
            {detail && <span className="kpi-chip-detail">{detail}</span>}
        </span>
    </div>
);
