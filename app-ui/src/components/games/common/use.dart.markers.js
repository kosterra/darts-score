import { useEffect, useState } from 'react';

/**
 * Where each dart of the visit was tapped on the board, so the board can mark
 * it: { markers, remember(value, point) }. A new visit ("visitKey") starts
 * without marks; a dart cleared or typed over loses its mark.
 */
const useDartMarkers = (currentThrow, visitKey) => {
    // by the dart's place in the visit: { x, y, dart }
    const [taps, setTaps] = useState([]);
    useEffect(() => setTaps([]), [visitKey]);
    // a dart that does not count (stored as 0) keeps its mark
    const markers = currentThrow.map((dart, index) => taps[index] && (taps[index].dart === dart || dart === '0') ? taps[index] : null);

    const remember = (value, point) => {
        // the dart goes into the first empty place of the visit
        const slot = currentThrow.findIndex(dart => dart.trim() === '');
        if (point && slot >= 0) setTaps(Object.assign([...markers], { [slot]: { ...point, dart: value } }));
    };

    return { markers, remember };
};

export default useDartMarkers;
