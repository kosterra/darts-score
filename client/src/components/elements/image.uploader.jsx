import React, {useState, useRef} from "react";
import Avatar from 'react-avatar';

const ImageUploader = (props) => {

    const {
        name,
        previewUrl,
        onFileChange,
        onFileDelete
    } = props;

    const[isDragging, setIsDragging] = useState(false);
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
        handleOnFileDelete(imageFile);
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
            <div>
                <Avatar
                    name={ name }
                    src={ previewUrl }
                    size="120"
                    round={ true }
                    color="#565656"
                    textSizeRatio={ 2 }
                />
                { previewUrl &&
                    <span
                        className="delete-file text-secondary py-1 px-2 bg-tertiary rounded-circle"
                        onClick={ handleOnFileDelete }>
                        <i className="fas fa-trash fs-8"></i>
                    </span>
                }
            </div>
            <div
                className={`drop-zone mt-3 p-3 border-dotted-grey pe-auto ${isDragging ? 'is-dragging' : ''}`}
                onDragOver = { handleOnDragOver }
                onDragLeave={ handleOnDragLeave }
                onDrop = { handleOnDrop }
                onClick = { () => fileInput.current.click() }
            >
                <span className="fs-8 text-secondary"><ins>Upload</ins> or Drag and drop image</span>
                <input 
                    type="file" 
                    accept="image/png, image/jpg, image/jpeg"
                    ref={fileInput} hidden 
                    onChange={ handleOnFileChange }
                />
            </div>
       </div>
    )
}

export default ImageUploader;