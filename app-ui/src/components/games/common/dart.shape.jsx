import { useId } from 'react';

import { FlightArt } from '../../flights/flight.art';
import { barrelColor } from '../../flights/barrels';

/**
 * A dart stuck in the board as the thrower sees it: it points back at the
 * oche, so it is seen almost along its length. The dart is laid out in three
 * dimensions (its axis from the tip towards the thrower, drawn a little down
 * and to the left; the board's landing tilt turns the tail up, as darts that
 * drop into a board stick) and drawn as seen from the front: the
 * barrel and the shaft short, the four flights a cross in perspective, each
 * one a flat flight sheet seen at its angle. Units are the board's (about
 * 7.5 to the centimetre).
 */

// the dart's axis, from the tip to the tail: mostly towards the thrower (z), a little down (turned up as it lands) and left
const AXIS = (() => {
    const [x, y, z] = [-0.22, 0.5, 0.84];
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
})();

// two directions square to the axis, to place the flights round it
const cross = ([a1, a2, a3], [b1, b2, b3]) => [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
const unit = (v) => { const length = Math.hypot(...v); return v.map(c => c / length); };
const SIDE = unit(cross(AXIS, [0, 0, 1]));
const UP = unit(cross(AXIS, SIDE));

// along the dart, from the tip (board units): point, barrel, shaft, flights
const PARTS = { barrel: [22, 60], shaft: [60, 88], flights: [78, 112] };
const BARREL_RADIUS = 3.4;
const SHAFT_RADIUS = 1.2;
const FLIGHT_RADIUS = 17;
// the cross of the flights turned a little, so none is seen exactly edge-on
const ROLL = 15;
// the whole dart's size on the board
const SCALE = 1;

// a point of the dart on the screen: so far along it, so far out in a direction
const at = (t, radial = [0, 0, 0], out = 0) => [AXIS[0] * t + radial[0] * out, AXIS[1] * t + radial[1] * out];
const segment = ([from, to]) => { const [x1, y1] = at(from); const [x2, y2] = at(to); return { x1, y1, x2, y2 }; };

// each flight: its direction out from the axis, how near the eye it is, and how its flat drawing lies on the screen
const WINGS = [0, 90, 180, 270].map(angle => {
    const radians = ((angle + ROLL) * Math.PI) / 180;
    const radial = SIDE.map((c, index) => c * Math.cos(radians) + UP[index] * Math.sin(radians));
    // the flat drawing: x 0..100 along the dart from where the flight starts, y 0..-40 outwards
    const along = (PARTS.flights[1] - PARTS.flights[0]) / 100;
    const outwards = FLIGHT_RADIUS / 40;
    const matrix = [
        AXIS[0] * along, AXIS[1] * along,
        -radial[0] * outwards, -radial[1] * outwards,
        AXIS[0] * PARTS.flights[0], AXIS[1] * PARTS.flights[0],
    ];
    return { angle, depth: radial[2], matrix: `matrix(${matrix.map(value => value.toFixed(4)).join(' ')})` };
});

// across the barrel on the screen, for its grip rings and its shine
const ACROSS = unit([-AXIS[1], AXIS[0]]);

/**
 * color, shape and design: the flights; barrel: the barrel's finish.
 */
const Dart = ({ color, shape = 'standard', design = 'plain', barrel = 'classic' }) => {
    const uid = `dart-${useId().replace(/:/g, '')}`;
    const finish = barrelColor(barrel);
    const wing = ({ angle, depth, matrix }) => (
        <g key={angle} transform={matrix}>
            <FlightArt shape={shape} design={design} color={color} uid={`${uid}-${angle}`} half="upper" />
            {/* the far side of the cross a little in the shade */}
            {depth < 0 && <rect x="-5" y="-45" width="110" height="45" fill="#000000" opacity="0.18" clipPath={`url(#${uid}-${angle}-shape)`} />}
        </g>
    );
    const rings = [];
    for (let t = PARTS.barrel[0] + 8; t < PARTS.barrel[1] - 5; t += 4) {
        const [x, y] = at(t);
        rings.push(<line key={t} x1={x + ACROSS[0] * BARREL_RADIUS} y1={y + ACROSS[1] * BARREL_RADIUS} x2={x - ACROSS[0] * BARREL_RADIUS} y2={y - ACROSS[1] * BARREL_RADIUS} stroke="rgba(0, 0, 0, 0.35)" strokeWidth="0.7" />);
    }
    const [shineX, shineY] = [ACROSS[0] * BARREL_RADIUS * 0.45, ACROSS[1] * BARREL_RADIUS * 0.45];
    const barrelLine = segment(PARTS.barrel);

    return (
        <g className="dart-shape" transform={`scale(${SCALE})`}>
            {/* its shadow on the board, along the dart */}
            <ellipse cx={at(28)[0]} cy={at(28)[1] + 3} rx="5" ry="2" className="dart-shadow" />
            {/* the flights on the far side of the dart first, then the dart, then those near the eye */}
            {WINGS.filter(entry => entry.depth < 0).map(wing)}
            <line {...segment([0, PARTS.barrel[0] + 1])} stroke="#dfe4e9" strokeWidth="1.1" strokeLinecap="round" />
            <line {...barrelLine} stroke={finish} strokeWidth={BARREL_RADIUS * 2} strokeLinecap="round" />
            <line x1={barrelLine.x1 + shineX} y1={barrelLine.y1 + shineY} x2={barrelLine.x2 + shineX} y2={barrelLine.y2 + shineY} stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.1" strokeLinecap="round" />
            {rings}
            <line {...segment(PARTS.shaft)} stroke="#3a4048" strokeWidth={SHAFT_RADIUS * 2} strokeLinecap="round" />
            {WINGS.filter(entry => entry.depth >= 0).map(wing)}
        </g>
    );
};

export default Dart;
