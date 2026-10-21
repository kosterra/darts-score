import { FaArrowDownLong, FaArrowUpLong } from 'react-icons/fa6';

/**
 * The figures of a player's X01 form, each against the games before: better
 * in green, worse in red, about the same in grey. "lowerIsBetter" for those
 * where less is good; "step" is how much counts as a change at all.
 */
const FORM_FIGURES = [
    { key: 'checkoutRate', label: 'Checkout', unit: '%', step: 2, detail: (figures) => `${figures.checkoutHits}/${figures.checkoutAttempts}` },
    { key: 'tonPlus', label: 'Ton+ visits', unit: '%', step: 1, hint: 'Visits of 100 or more, of the visits with more than 100 left' },
    { key: 'firstNine', label: 'First 9', step: 1.5, hint: 'The average of the first three visits of a leg' },
    { key: 'dartsPerLeg', label: 'Darts per leg', step: 0.5, lowerIsBetter: true, hint: 'Darts thrown in the legs won' },
    { key: 'oneEighties', label: '180s', step: 1, plain: true },
    { key: 'under10', label: 'Under 10', unit: '%', step: 1, lowerIsBetter: true, hint: 'Visits below 10, of the visits with more than 100 left' },
    { key: 'under30', label: 'Under 30', unit: '%', step: 1.5, lowerIsBetter: true, hint: 'Visits below 30, of the visits with more than 100 left' },
    { key: 'under50', label: 'Under 50', unit: '%', step: 2, lowerIsBetter: true, hint: 'Visits below 50, of the visits with more than 100 left' },
];

const format = (value, unit) => value == null ? '–' : `${Number.isInteger(value) ? value : value.toFixed(1)}${unit ? ` ${unit}` : ''}`;

const Change = ({ figure, now, before }) => {
    if (now == null || before == null) return null;
    const change = Math.round((now - before) * 10) / 10;
    const unchanged = Math.abs(change) < figure.step;
    const better = figure.lowerIsBetter ? change < 0 : change > 0;
    const Icon = change > 0 ? FaArrowUpLong : FaArrowDownLong;
    return (
        <span className={`form-figure-change ${unchanged ? 'is-steady' : better ? 'is-better' : 'is-worse'}`} title={`Before: ${format(before, figure.unit)}`}>
            {unchanged ? '±' : <Icon aria-hidden="true" />}
            {unchanged ? '' : Math.abs(change).toFixed(1)}
        </span>
    );
};

/**
 * A player's X01 form in figures: their last games against the ones before.
 * form: as the form endpoint answers, with figures.recent and figures.previous.
 * keys: which figures, all by default. compact: smaller, for a widget.
 */
const FormFigures = ({ form, keys = null, compact = false }) => {
    const recent = form?.figures?.recent;
    if (!recent?.games) return null;
    const previous = form.figures.previous;
    const shown = keys ? FORM_FIGURES.filter(figure => keys.includes(figure.key)) : FORM_FIGURES;

    return (
        <div className={`form-figures ${compact ? 'is-compact' : ''}`}>
            {shown.map(figure => (
                <div key={figure.key} className="form-figure" title={figure.hint}>
                    <span className="form-figure-label">{figure.label}</span>
                    <span className="form-figure-value">
                        {format(recent[figure.key], figure.unit)}
                        {!figure.plain && <Change figure={figure} now={recent[figure.key]} before={previous?.[figure.key]} />}
                    </span>
                    {!compact && figure.detail && recent[figure.key] != null && <span className="text-faint fs-8">{figure.detail(recent)}</span>}
                </div>
            ))}
        </div>
    );
};

export default FormFigures;
