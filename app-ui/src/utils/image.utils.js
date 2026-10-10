const PLAYER_IMG_BASE = '/api/images/players/';

/**
 * Resolves a player profileImg field to a displayable URL.
 * The API stores only the filename; this prepends the API base URL.
 * Passes through full URLs unchanged (backward compat with legacy data).
 */
export const resolvePlayerImg = (filename) => {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    return PLAYER_IMG_BASE + filename;
};

/**
 * Returns the initials for a player's full name (e.g. "John Doe" → "JD").
 */
export const resolvePlayerInitials = (firstname, lastname) =>
    (firstname + ' ' + lastname).split(' ').map(n => n[0]).join('');

/**
 * Limits how far a cropped image may be dragged so it always covers the
 * square crop area. The offset is the image centre relative to the crop centre.
 */
export const clampCropOffset = (offset, displayWidth, displayHeight, viewportSize) => {
    const maxX = Math.max((displayWidth - viewportSize) / 2, 0);
    const maxY = Math.max((displayHeight - viewportSize) / 2, 0);
    return {
        x: Math.min(Math.max(offset.x, -maxX), maxX),
        y: Math.min(Math.max(offset.y, -maxY), maxY)
    };
};

/**
 * Returns the square region of the original image (in image pixels) that is
 * visible in the crop area for the given offset and display scale.
 */
export const getCropSourceRect = (offset, imageWidth, imageHeight, scale, viewportSize) => {
    const size = viewportSize / scale;
    return {
        x: (imageWidth - size) / 2 - offset.x / scale,
        y: (imageHeight - size) / 2 - offset.y / scale,
        size
    };
};
