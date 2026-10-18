import { isFormat } from '../../../utils/setup.memory';

/**
 * Common formats as pills: one tap sets the whole game up. The pill of the
 * format the game is set up in is highlighted.
 */
const QuickFormats = ({ formats, settings, playerCount, onApply }) => (
    <div className="quick-formats" role="group" aria-label="Quick formats">
        {formats.map(format => {
            const active = isFormat(settings, format, playerCount);
            return (
                <button
                    key={format.name}
                    type="button"
                    className={`quick-format ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => onApply(format.settings)}
                >
                    {format.name}
                </button>
            );
        })}
    </div>
);

export default QuickFormats;
