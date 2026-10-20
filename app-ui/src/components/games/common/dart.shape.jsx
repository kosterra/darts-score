import { useId } from 'react';

import { FlightArt } from '../../flights/flight.art';
import { barrelColor } from '../../flights/barrels';

const FLIGHT_CENTRE = { x: 0, y: 19 };
// the dart's size on the board: about a real dart's next to a real board (flights some 3 cm across)
const DART_SCALE = 1.6;

/**
 * A dart stuck straight in the board, seen from the oche: its tip at (0, 0),
 * the body foreshortened to a short stub below it (it points at the thrower)
 * and the flights as a cross behind it, bigger as they are nearer. No lean to
 * either side. color, shape and design: the flights, barrel: the barrel's
 * finish (components/flights).
 */
const Dart = ({ color, shape = 'standard', design = 'plain', barrel = 'classic', scale = DART_SCALE }) => {
    const uid = `dart-${useId().replace(/:/g, '')}`;
    return (
        <g className="dart-shape" transform={`scale(${scale})`}>
            {/* its shadow on the board, a little below */}
            <ellipse cx="0" cy="4" rx="2.2" ry="1.1" className="dart-shadow" />
            <line x1="0" y1="0" x2="0" y2="3.5" className="dart-point" />
            <line x1="0" y1="3.5" x2="0" y2="12" className="dart-barrel" style={{ stroke: barrelColor(barrel) }} />
            {[6, 8.5].map(y => <polyline key={y} points={`-2.3,${y} 2.3,${y}`} className="dart-grip" />)}
            <line x1="0" y1="12" x2="0" y2={FLIGHT_CENTRE.y} className="dart-shaft" />
            <g transform={`translate(${FLIGHT_CENTRE.x}, ${FLIGHT_CENTRE.y})`}>
                {[0, 90, 180, 270].map(angle => (
                    // each wing from the shaft outwards, along its diagonal; the flat drawing scaled to it
                    <g key={angle} transform={`rotate(${angle - 45}) scale(0.139, 0.07)`} className={`dart-flight-wing ${angle % 180 ? 'is-back' : ''}`}>
                        <FlightArt shape={shape} design={design} color={color} uid={`${uid}-${angle}`} />
                    </g>
                ))}
                <circle r="1.6" className="dart-shaft-end" />
            </g>
        </g>
    );
};

export default Dart;
