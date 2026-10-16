// The banner reloads when a global admin saves it, without reloading the page
export const BANNER_CHANGED = 'darts-score:banner-changed';

export const announceBannerChange = () => window.dispatchEvent(new Event(BANNER_CHANGED));

/**
 * Dark or light text, whichever reads better on the banner's colour.
 */
export const textColorOn = (hex) => {
    const value = /^#([0-9a-f]{6})$/i.exec(hex ?? '')?.[1];
    if (!value) return '#1d1c1a';
    const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.35 ? '#1d1c1a' : '#ffffff';
};
