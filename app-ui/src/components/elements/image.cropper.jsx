import { useState, useRef, useEffect } from "react";
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';

import { clampCropOffset, getCropSourceRect } from '../../utils/image.utils';

const VIEWPORT_SIZE = 240;  // px, on-screen size of the crop area
const OUTPUT_SIZE = 512;    // px, size of the cropped image
const MAX_ZOOM = 4;

const ImageCropper = ({ file, onCrop, onCancel }) => {
    const imgRef = useRef(null);
    const dragStart = useRef(null);

    const [imageUrl, setImageUrl] = useState('');
    const [imageSize, setImageSize] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setImageSize(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // scale 1 = the shorter image side exactly fills the crop area
    const scale = imageSize ? VIEWPORT_SIZE / Math.min(imageSize.width, imageSize.height) * zoom : 1;
    const displayWidth = imageSize ? imageSize.width * scale : 0;
    const displayHeight = imageSize ? imageSize.height * scale : 0;

    const handleOnImageLoad = event => {
        setImageSize({ width: event.target.naturalWidth, height: event.target.naturalHeight });
    }

    const handleOnPointerDown = event => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    }

    const handleOnPointerMove = event => {
        if (!dragStart.current) return;
        setOffset(clampCropOffset(
            { x: event.clientX - dragStart.current.x, y: event.clientY - dragStart.current.y },
            displayWidth, displayHeight, VIEWPORT_SIZE
        ));
    }

    const handleOnPointerUp = () => {
        dragStart.current = null;
    }

    const handleOnZoomChange = newZoom => {
        const newScale = scale / zoom * newZoom;
        setZoom(newZoom);
        setOffset(clampCropOffset(offset, imageSize.width * newScale, imageSize.height * newScale, VIEWPORT_SIZE));
    }

    const handleOnApply = () => {
        const source = getCropSourceRect(offset, imageSize.width, imageSize.height, scale, VIEWPORT_SIZE);
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        canvas.getContext('2d').drawImage(
            imgRef.current,
            source.x, source.y, source.size, source.size,
            0, 0, OUTPUT_SIZE, OUTPUT_SIZE
        );

        // keep PNG (transparency), everything else becomes JPEG
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const extension = type === 'image/png' ? '.png' : '.jpg';
        const filename = file.name.replace(/\.[^.]*$/, '') + extension;

        canvas.toBlob(blob => onCrop(new File([blob], filename, { type })), type, 0.9);
    }

    return (
        <div className="d-flex flex-column justify-content-center align-items-center gap-3">
            <div
                className="position-relative overflow-hidden rounded-1 bg-shade900"
                style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: 'move', touchAction: 'none' }}
                onPointerDown={handleOnPointerDown}
                onPointerMove={handleOnPointerMove}
                onPointerUp={handleOnPointerUp}
                onPointerCancel={handleOnPointerUp}
            >
                {imageUrl &&
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Crop preview"
                        draggable={false}
                        onLoad={handleOnImageLoad}
                        className="position-absolute"
                        style={{
                            width: displayWidth || 'auto',
                            height: displayHeight || 'auto',
                            maxWidth: 'none',
                            left: (VIEWPORT_SIZE - displayWidth) / 2 + offset.x,
                            top: (VIEWPORT_SIZE - displayHeight) / 2 + offset.y,
                            visibility: imageSize ? 'visible' : 'hidden',
                            userSelect: 'none'
                        }}
                    />
                }
                {/* darken everything outside the round avatar area */}
                <div
                    className="position-absolute top-0 start-0 w-100 h-100 rounded-circle"
                    style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)', pointerEvents: 'none' }}
                />
            </div>
            <div className="d-flex align-items-center gap-3" style={{ width: VIEWPORT_SIZE }}>
                <i className="pi pi-search-minus text-shade400" />
                <Slider
                    value={zoom}
                    min={1}
                    max={MAX_ZOOM}
                    step={0.01}
                    onChange={event => handleOnZoomChange(event.value)}
                    disabled={!imageSize}
                    className="flex-grow-1"
                    aria-label="Zoom"
                />
                <i className="pi pi-search-plus text-shade400" />
            </div>
            <span className="fs-7 text-shade600">Drag the image to position it</span>
            <div className="d-flex gap-2 mb-3">
                <Button type="button" label="Cancel" icon="pi pi-times" size="small" severity="secondary" onClick={onCancel} />
                <Button type="button" label="Apply" icon="pi pi-check" size="small" onClick={handleOnApply} disabled={!imageSize} />
            </div>
        </div>
    )
}

export default ImageCropper;
