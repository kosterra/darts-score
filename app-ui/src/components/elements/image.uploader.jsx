import { useState, useRef } from "react";
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { FaTrash } from "react-icons/fa";

import ImageCropper from './image.cropper';
import { t } from '../../utils/i18n';

const ImageUploader = (props) => {

    const {
        name,
        previewUrl,
        onFileChange,
        onFileDelete
    } = props;

    const [isDragging, setIsDragging] = useState(false);
    // file picked by the user that still has to be cropped
    const [cropFile, setCropFile] = useState(null);
    const fileInput = useRef(null);

    const handleOnDragOver = event => {
        event.preventDefault();
        setIsDragging(true);
    }

    const handleOnDragLeave = event => {
        event.preventDefault();
        setIsDragging(false);
    }

    const handleOnDrop = event => {
        //prevent the browser from opening the image
        event.preventDefault();
        event.stopPropagation();
        //let's grab the image file
        let imageFile = event.dataTransfer.files[0];
        if (imageFile?.type.startsWith('image/')) setCropFile(imageFile);
        setIsDragging(false);
    }

    const handleOnFileDelete = event => {
        event.preventDefault();
        onFileDelete();
    }

    const handleOnFileChange = event => {
        event.preventDefault();
        if (event.target.files[0]) setCropFile(event.target.files[0]);
        // allow picking the same file again
        event.target.value = '';
    }

    const handleOnCrop = croppedFile => {
        setCropFile(null);
        onFileChange(croppedFile);
    }

    if (cropFile) {
        return (
            <ImageCropper
                file={cropFile}
                onCrop={handleOnCrop}
                onCancel={() => setCropFile(null)}
            />
        );
    }

    return (
        <div className="file-upload d-flex flex-column justify-content-center align-items-center">
            <div className="position-relative">
                <Avatar
                    label={name.split(" ").map((n) => n[0]).join("")}
                    image={previewUrl}
                    shape="circle"
                    size="xlarge"
                    style={{ width: '10rem', height: '10rem' }}
                />
                {previewUrl &&
                    <span className="position-absolute top-85 start-85 translate-middle">
                        <Button
                            type="button"
                            severity="danger"
                            rounded aria-label={t('Delete Profile Image')}
                            onClick={handleOnFileDelete}>
                            <FaTrash />
                        </Button>
                    </span>
                }
            </div>
            <div
                className={`drop-zone m-3 p-4 pe-auto ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleOnDragOver}
                onDragLeave={handleOnDragLeave}
                onDrop={handleOnDrop}
                onClick={() => fileInput.current.click()}
            >
                <span className="fs-7 text-faint"><ins>{t('Upload')}</ins>{' '}{t('or Drag and drop image')}</span>
                <input
                    type="file"
                    accept="image/png, image/jpg, image/jpeg"
                    ref={fileInput} hidden
                    onChange={handleOnFileChange}
                />
            </div>
        </div>
    )
}

export default ImageUploader;