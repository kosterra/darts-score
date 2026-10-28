import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { t } from '../../utils/i18n';

const DeletePopup = (props) => {
    const {
        header = t('Delete'),
        message = 'unknown',
        data,
        handleDelete,
        // optional: a label and a size for the button (an icon button otherwise)
        label,
        size
    } = props;

    const [showDialog, setShowDialog] = useState(false);

    return (
        <div>
            {/* as the confirm dialogs of the app: the question beside a warning, Cancel and Delete */}
            <Dialog
                header={header}
                visible={showDialog}
                blockScroll={true}
                onHide={() => setShowDialog(false)}
                draggable={false}
                className="p-confirm-dialog"
                footer={(
                    <>
                        <Button label={t('Cancel')} severity="secondary" size="small" onClick={() => setShowDialog(false)} />
                        <Button label={t('Delete')} severity="danger" size="small" onClick={() => {
                            handleDelete(data);
                            setShowDialog(false);
                        }} />
                    </>
                )}
            >
                <div className="d-flex align-items-start">
                    <i className="p-confirm-dialog-icon pi pi-exclamation-triangle" aria-hidden="true" />
                    <span className="p-confirm-dialog-message">{t('Are you sure you want to delete')}{' '}{message}?</span>
                </div>
            </Dialog>

            <div className="d-flex justify-content-center">
                <Button
                    severity="danger"
                    icon="pi pi-trash"
                    label={label}
                    size={size}
                    title={header}
                    aria-label={header}
                    onClick={() => setShowDialog(true)}
                />
            </div>
        </div>
    );
};

export default DeletePopup;