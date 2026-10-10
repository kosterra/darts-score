import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';
import JsonView from '@uiw/react-json-view';

const JSONViewer = (props) => {
    const {
        header = '_RAW Data',
        data
    } = props;

    const [showDialog, setShowDialog] = useState(false);

    return (
        <div>
            <Dialog
                header={header}
                visible={showDialog}
                blockScroll={true}
                onHide={() => setShowDialog(false)}
                className="p-4"
                maximizable
                maximized={false}
                draggable={false}
            >
                {data &&
                    <div className="">
                        <JsonView value={data} keyName="root" style={githubDarkTheme} />
                    </div>
                }
                {!data &&
                    <div className="d-flex justify-content-center mt-4">
                        <span className="empty-text text-shade700">No JSON data found</span>
                    </div>
                }
            </Dialog>

            <div className="d-flex justify-content-center">
                <Button
                    severity="info"
                    icon="pi pi-code"
                    title="Show _raw data"
                    onClick={() => setShowDialog(true)}
                />
            </div>
        </div>
    );
};

export default JSONViewer;