import { useId } from 'react';

import { secondColorOf } from '../../../utils/flights';

// the four flights seen from behind, as a cross: one wing per shape, from the
// shaft outwards along x (turned to the diagonal when drawn), turned round its middle
const WINGS = {
    standard: 'M 0,0 L 5.8,-2.1 L 13.9,0 L 5.8,2.1 Z',
    slim: 'M 0,0 L 7,-1.2 L 13.9,0 L 7,1.2 Z',
    kite: 'M 0,0 L 9.5,-2.7 L 13.9,0 L 9.5,2.7 Z',
    pear: 'M 0,0 C 4,-1 9,-3.4 12.4,-2.3 C 14.4,-1.3 14.4,1.3 12.4,2.3 C 9,3.4 4,1 0,0 Z',
};
// the parts a pattern paints in the second colour, cut to the wing: its outer end, a band across it
const WING_TIP = { x: 10.4, y: -4, width: 4, height: 8 };
const WING_STRIPE = { x: 6.2, y: -4, width: 1.7, height: 8 };
const FLIGHT_CENTRE = { x: 0, y: 19 };
// the dart's size on the board: about a real dart's next to a real board (flights some 3 cm across)
const DART_SCALE = 1.6;

/**
 * A dart stuck straight in the board, seen from the oche: its tip at (0, 0),
 * the body foreshortened to a short stub below it (it points at the thrower)
 * and the flights as a cross behind it, bigger as they are nearer. No lean to
 * either side. color, pattern and shape: the flights ('plain', 'twoTone' with
 * every other wing in a second colour, 'tipped', 'striped'; 'standard',
 * 'slim', 'kite', 'pear').
 */
const Dart = ({ color, pattern = 'plain', shape = 'standard', scale = DART_SCALE }) => {
    const second = secondColorOf(color);
    const wing = WINGS[shape] ?? WINGS.standard;
    const clip = `dart-wing-${useId().replace(/:/g, '')}`;
    return (
        <g className="dart-shape" transform={`scale(${scale})`}>
            {/* its shadow on the board, a little below */}
            <ellipse cx="0" cy="4" rx="2.2" ry="1.1" className="dart-shadow" />
            <line x1="0" y1="0" x2="0" y2="3.5" className="dart-point" />
            <line x1="0" y1="3.5" x2="0" y2="12" className="dart-barrel" />
            {[6, 8.5].map(y => <polyline key={y} points={`-2.3,${y} 2.3,${y}`} className="dart-grip" />)}
            <line x1="0" y1="12" x2="0" y2={FLIGHT_CENTRE.y} className="dart-shaft" />
            <clipPath id={clip}><path d={wing} /></clipPath>
            <g transform={`translate(${FLIGHT_CENTRE.x}, ${FLIGHT_CENTRE.y})`}>
                {[0, 90, 180, 270].map(angle => (
                    <g key={angle} transform={`rotate(${angle - 45})`} className={`dart-flight-wing ${angle % 180 ? 'is-back' : ''}`}>
                        <path d={wing} fill={pattern === 'twoTone' && angle % 180 ? second : color} className="dart-flight" />
                        {pattern === 'tipped' && <rect {...WING_TIP} fill={second} clipPath={`url(#${clip})`} />}
                        {pattern === 'striped' && <rect {...WING_STRIPE} fill={second} clipPath={`url(#${clip})`} />}
                    </g>
                ))}
                <circle r="1.6" className="dart-shaft-end" />
            </g>
        </g>
    );
};

export default Dart;
