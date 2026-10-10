import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { FaQuestionCircle } from "react-icons/fa";

const DeletePopup = (props) => {
    const {
        header = 'Delete Object',
        message = 'unknown',
        data,
        handleDelete
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
                        Are you sure you want to delete {message}?
                    </span>
                </div>
                <div className="col-12 d-flex justify-content-end align-items-center gap-3 mt-4">
                    <Button
                        severity="secondary"
                        size="small"
                        onClick={() => setShowDialog(false)}
                    >
                        Cancel
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
                        Sure!
                    </Button>
                </div>
            </Dialog>

            <div className="d-flex justify-content-center">
                <Button
                    severity="danger"
                    icon="pi pi-trash"
                    title="Show _raw data"
                    onClick={() => setShowDialog(true)}
                />
            </div>
        </div>
    );
};

export default DeletePopup;