import { useState, useRef } from "react";
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { FaTrash } from "react-icons/fa";

const ImageUploader = (props) => {

    const {
        name,
        previewUrl,
        onFileChange,
        onFileDelete
    } = props;

    const [isDragging, setIsDragging] = useState(false);
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
        onFileChange(imageFile);
        setIsDragging(false);
    }

    const handleOnFileDelete = event => {
        event.preventDefault();
        onFileDelete();
    }

    const handleOnFileChange = event => {
        event.preventDefault();
        onFileChange(event.target.files[0]);
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
                            rounded aria-label="Delete Profile Image"
                            onClick={handleOnFileDelete}>
                            <FaTrash />
                        </Button>
                    </span>
                }
            </div>
            <div
                className={`drop-zone m-3 p-4 border border-shade600 rounded-1 pe-auto ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleOnDragOver}
                onDragLeave={handleOnDragLeave}
                onDrop={handleOnDrop}
                onClick={() => fileInput.current.click()}
            >
                <span className="fs-7 text-shade600"><ins>Upload</ins> or Drag and drop image</span>
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