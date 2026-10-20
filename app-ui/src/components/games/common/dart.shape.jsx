import { secondColorOf } from '../../../utils/flights';

// the four flights seen from behind, as a cross: one wing, turned round its middle
const WING = '0,0 2.6,-5.6 9.8,-9.8 5.6,-2.6';
// the parts of a wing a pattern paints in the second colour: its outer tip, a band across it
const WING_TIP = '6.92,-8.12 9.8,-9.8 8.12,-6.92';
const WING_STRIPE = '4.04,-6.44 5.48,-7.28 7.28,-5.48 6.44,-4.04';
const FLIGHT_CENTRE = { x: 0, y: 19 };
// the dart's size on the board: about a real dart's next to a real board (flights some 3 cm across)
const DART_SCALE = 1.6;

/**
 * A dart stuck straight in the board, seen from the oche: its tip at (0, 0),
 * the body foreshortened to a short stub below it (it points at the thrower)
 * and the flights as a cross behind it, bigger as they are nearer. No lean to
 * either side. color and pattern: the flights ('plain', 'twoTone' with every
 * other wing in a second colour, 'tipped', 'striped').
 */
const Dart = ({ color, pattern = 'plain', scale = DART_SCALE }) => {
    const second = secondColorOf(color);
    return (
        <g className="dart-shape" transform={`scale(${scale})`}>
            {/* its shadow on the board, a little below */}
            <ellipse cx="0" cy="4" rx="2.2" ry="1.1" className="dart-shadow" />
            <line x1="0" y1="0" x2="0" y2="3.5" className="dart-point" />
            <line x1="0" y1="3.5" x2="0" y2="12" className="dart-barrel" />
            {[6, 8.5].map(y => <polyline key={y} points={`-2.3,${y} 2.3,${y}`} className="dart-grip" />)}
            <line x1="0" y1="12" x2="0" y2={FLIGHT_CENTRE.y} className="dart-shaft" />
            <g transform={`translate(${FLIGHT_CENTRE.x}, ${FLIGHT_CENTRE.y})`}>
                {[0, 90, 180, 270].map(angle => (
                    <g key={angle} transform={`rotate(${angle})`} className={`dart-flight-wing ${angle % 180 ? 'is-back' : ''}`}>
                        <polygon points={WING} fill={pattern === 'twoTone' && angle % 180 ? second : color} className="dart-flight" />
                        {pattern === 'tipped' && <polygon points={WING_TIP} fill={second} />}
                        {pattern === 'striped' && <polygon points={WING_STRIPE} fill={second} />}
                    </g>
                ))}
                <circle r="1.6" className="dart-shaft-end" />
            </g>
        </g>
    );
};

export default Dart;
