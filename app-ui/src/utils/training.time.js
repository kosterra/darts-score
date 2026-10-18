// Around the Clock times are stored in hundredths of a second (the field is
// called timeMs for historical reasons).

/**
 * e.g. 8345 → "1:23.45"; digits: how many decimals of the seconds are shown
 */
export const formatTrainingTime = (hundredths, digits = 2) => {
    if (hundredths == null) return '–';
    hundredths = Math.floor(hundredths);
    // cut off like a stopwatch, never rounded up
    const minutes = Math.floor(hundredths / 6000);
    const seconds = String(Math.floor(hundredths / 100) % 60).padStart(2, '0');
    const fraction = String(hundredths % 100).padStart(2, '0').slice(0, digits);
    return `${minutes}:${seconds}${fraction ? `.${fraction}` : ''}`;
};

// the hundredths a stopwatch shows after this many milliseconds; never 0 once started
export const toHundredths = (ms) => Math.max(1, Math.floor(ms / 10));
