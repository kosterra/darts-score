import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { FaQuestionCircle } from "react-icons/fa";
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
            <Dialog
                header={header}
                visible={showDialog}
                blockScroll={true}
                onHide={() => setShowDialog(false)}
                draggable={false}
            >
                <div className="col-12 d-flex flex-column justify-content-center align-items-center gap-4 pb-4">
                    <FaQuestionCircle className="display-4 text-blue" />
                    <span className="fs-6">
                        {t('Are you sure you want to delete')}{' '}{message}?
                    </span>
                </div>
                <div className="col-12 d-flex justify-content-end align-items-center gap-3 mt-4">
                    <Button
                        severity="secondary"
                        size="small"
                        onClick={() => setShowDialog(false)}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        severity="danger"
                        size="small"
                        onClick={() => {
                                handleDelete(data);
                                setShowDialog(false);
                            }
                        }
                    >
                        {t('Sure!')}
                    </Button>
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