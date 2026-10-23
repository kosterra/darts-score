import { isFormat } from '../../../utils/setup.memory';
import { t } from '../../../utils/i18n';

/**
 * Common formats as pills: one tap sets the whole game up. The pill of the
 * format the game is set up in is highlighted. The club's own formats come
 * first, a friendly one with its mark. onApply(settings, format)
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
                    onClick={() => onApply(format.settings, format)}
                >
                    {format.club && <i className="pi pi-building me-2" aria-hidden="true" title={t('A format of the club')} />}
                    {format.name}
                    {format.friendly && <span className="quick-format-tag">{t('Friendly')}</span>}
                </button>
            );
        })}
        </div>
    </div>
);

export default QuickFormats;
