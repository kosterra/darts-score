import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';

/**
 * An editor that opens right under a row of a list (instead of a popup):
 * its title, a close button, and what is edited.
 */
const RowEditor = ({ title, onClose, children }) => (
    <div className="row-editor" role="region" aria-label={title}>
        <div className="row-editor-head">
            <span className="text-default fw-semibold">{title}</span>
            <Button type="button" icon="pi pi-times" text rounded severity="secondary" aria-label={t('Close')} onClick={onClose} />
        </div>
        {children}
    </div>
);

export default RowEditor;
