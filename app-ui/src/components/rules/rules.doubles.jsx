/**
 * The doubles of a training around the board as a strip, D1 to the bull (or Catch 40's
 * finishes, 61 to 100): each
 * double played in the colour of what it took (cells from the training's
 * doubles(), tone 0 the worst to 3 the best) with the figure in it, the one
 * to throw at now in the accent and a little bigger, the ones to come faint.
 * label says what the figures are (e.g. "Hits out of 3 per double"); a plain
 * cell shows its name alone, its colour says it all (its value only in its title); live
 * marks the strip of a training under way, where the double just finished
 * pops as the next one lights up.
 */
const RulesDoubles = ({ cells, label, live = false, className = '' }) => {
    const last = live ? cells.findIndex(cell => cell.current) - 1 : -1;
    return (
        // more than the 21 doubles (Catch 40's 40 finishes): rows of their own
        <figure className={`rules-doubles ${live ? 'is-live' : ''} ${cells.length > 21 ? 'is-many' : ''} ${className}`}>
            {label && <figcaption className="rules-doubles-label">{label}</figcaption>}
            <ol className="rules-doubles-cells">
                {cells.map((cell, index) => (
                    <li
                        key={cell.name}
                        className={`rules-double ${cell.plain ? 'is-plain' : ''} ${cell.tone === null ? 'is-open' : `is-tone-${cell.tone}`} ${cell.current ? 'is-current' : ''} ${index === last ? 'is-last' : ''}`}
                        aria-current={cell.current ? 'step' : undefined}
                        title={cell.value === null ? cell.name : `${cell.name}: ${cell.value}`}
                    >
                        <span className="rules-double-name">{cell.short}</span>
                        {!cell.plain && <span className="rules-double-value">{cell.value ?? (cell.current ? '●' : '')}</span>}
                    </li>
                ))}
            </ol>
        </figure>
    );
};

export default RulesDoubles;
