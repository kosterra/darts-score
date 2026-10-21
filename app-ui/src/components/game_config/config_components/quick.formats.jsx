import { isFormat } from '../../../utils/setup.memory';
import { t } from '../../../utils/i18n';

/**
 * Common formats as pills: one tap sets the whole game up. The pill of the
 * format the game is set up in is highlighted.
 */
const QuickFormats = ({ formats, settings, playerCount, onApply }) => (
    <div className="setting-box" role="group" aria-label={t('Quick formats')}>
        <p className="setting-title">{t('Quick formats')}</p>
        <div className="quick-formats">
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
    </div>
);

export default QuickFormats;
