import { createElement as h } from 'react';

// a wedge of the board, its rings from the bull outwards: inner single, treble, outer single, double
const CX = 12;
const CY = 31;
const HALF = (24 * Math.PI) / 180;
const RINGS = { innerSingle: [9, 15], treble: [15, 18.5], outerSingle: [18.5, 25], double: [25, 29] };
const at = (r, a) => `${(CX + r * Math.sin(a)).toFixed(2)} ${(CY - r * Math.cos(a)).toFixed(2)}`;
const sector = ([r1, r2]) => `M ${at(r1, -HALF)} L ${at(r2, -HALF)} A ${r2} ${r2} 0 0 1 ${at(r2, HALF)} L ${at(r1, HALF)} A ${r1} ${r1} 0 0 0 ${at(r1, -HALF)} Z`;
const FILLED = { T: ['treble'], D: ['double'], S: ['innerSingle', 'outerSingle'] };

/**
 * Where on the board a dart landed, as a button's icon: a wedge of the board with the ring
 * filled, the treble ring (T), the double ring (D) or the two single fields (S); the other
 * rings only outlined. In the colour of the text around it.
 */
const SegmentIcon = ({ ring, className = '' }) => h('svg', { viewBox: '0 0 24 24', width: '1.7em', height: '1.7em', className: `segment-icon ${className}`, 'aria-hidden': 'true', focusable: 'false' },
    Object.entries(RINGS).map(([name, radii]) => h('path', {
        key: name,
        d: sector(radii),
        fill: FILLED[ring]?.includes(name) ? 'currentColor' : 'none',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinejoin: 'round',
        opacity: FILLED[ring]?.includes(name) ? 1 : 0.55,
    })));

export default SegmentIcon;
