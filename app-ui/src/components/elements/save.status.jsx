import { t } from '../../utils/i18n';

/**
 * Where a section says how its saving goes, the same everywhere (settings
 * save as you go, see useAutoSave): "Saving…", "Saved" with a check, or
 * what went wrong with Try again. Nothing before the first change. Put it
 * beside the section's title (a Panel's icons, a setting's title).
 */
const SaveStatus = ({ status, error, retry, className = '' }) => {
    if (!status || status === 'idle') return <span className={`autosave-status ${className}`} aria-live="polite" />;
    return (
        <span className={`autosave-status is-${status} ${className}`} aria-live="polite">
            {status === 'saving' && t('Saving…')}
            {status === 'saved' && <><i className="pi pi-check" aria-hidden="true" />{t('Saved')}</>}
            {status === 'error' &&
                <>
                    <i className="pi pi-exclamation-circle" aria-hidden="true" />
                    <span>{t('Not saved')}{error?.message ? `: ${error.message}` : ''}</span>
                    {retry && <button type="button" className="autosave-status-retry" onClick={retry}>{t('Try again')}</button>}
                </>}
        </span>
    );
};

export default SaveStatus;
