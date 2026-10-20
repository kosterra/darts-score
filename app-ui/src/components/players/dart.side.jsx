import { useEffect, useId, useRef } from 'react';

import { FlightArt } from '../flights/flight.art';
import { BarrelArt } from '../flights/barrel.art';

// where the flights sit on the dart, and how fast it turns (one turn in seconds)
const FLIGHTS_AT = 102;
const TURN_SECONDS = 5;
const START_TURN = 30;
const ANGLES = [0, 90, 180, 270];
// how dark a wing gets right behind the dart
const MAX_SHADE = 0.22;

// a wing at its angle: half of the flat drawing (a sheet makes two opposite
// wings), squeezed to how far it reaches up or down
const wingTransform = (angle, reach) => `translate(${FLIGHTS_AT}, 0) scale(0.3, ${(angle % 180 === 0 ? 0.35 : -0.35) * reach})`;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A dart seen from the side, its tip at (0, 0) and the rest to the right
 * (to x 132): the steel point, the barrel (one of the barrels to collect),
 * the shaft and the four flights (the flights across the line of sight get
 * narrow, those behind it darker). spin: it turns slowly round its axis;
 * otherwise it stays at its turn (degrees), one that shows the flights well. color, shape and
 * design: the flights; barrel: its barrel.
 */
export const DartProfile = ({ color, shape = 'standard', design = 'plain', barrel = 'classic', spin = false, turn = START_TURN }) => {
    const id = useId().replace(/:/g, '');
    // each wing is drawn twice, behind the dart and in front of it; turning
    // only moves and shows the right one, so the flights are not drawn again
    // on every frame (the detailed designs would make it stutter)
    const wingRefs = useRef({});
    const shadeRefs = useRef({});

    useEffect(() => {
        // the dart's turn round its axis, in degrees: how far each wing reaches up or down, and which side of the dart it is on
        const place = (turn) => {
            ANGLES.forEach(angle => {
                const radians = ((turn + angle) * Math.PI) / 180;
                const reach = Math.sin(radians);
                const inFront = Math.cos(radians) >= 0;
                const transform = wingTransform(angle, reach);
                // the shade follows the turn: none facing the eye, darkest right behind the
                // dart, so a wing does not jump from dark to bright as it comes round
                const shade = (MAX_SHADE * (1 - Math.cos(radians)) / 2).toFixed(3);
                ['back', 'front'].forEach(layer => {
                    const element = wingRefs.current[`${layer}-${angle}`];
                    if (!element) return;
                    element.setAttribute('transform', transform);
                    element.style.display = (layer === 'front') === inFront ? '' : 'none';
                    shadeRefs.current[`${layer}-${angle}`]?.setAttribute('opacity', shade);
                });
            });
        };
        place(turn);
        if (!spin || reducedMotion()) return undefined;
        let frame;
        const start = performance.now();
        const step = (now) => {
            place(turn + ((now - start) / 1000 / TURN_SECONDS) * 360);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [shape, design, color, spin, turn]);

    // the wings in their two layers (the back one first in the drawing)
    const wings = (layer) => ANGLES.map(angle => (
        <g key={angle} ref={element => { wingRefs.current[`${layer}-${angle}`] = element; }} transform={wingTransform(angle, 0)}>
            <FlightArt shape={shape} design={design} color={color} uid={`${id}-${layer}-${angle}`} half={angle % 180 === 0 ? 'upper' : 'lower'} shadeRef={element => { shadeRefs.current[`${layer}-${angle}`] = element; }} />
        </g>
    ));

    return (
        <g className="dart-profile">
            <defs>
                {/* lit from the front, as the flights: the metal is the same shade at its upper and
                    lower edge, so it looks as centred on the dart as it is (a dark lower edge would
                    vanish into the background and make the flights look too low) */}
                <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8d969f" />
                    <stop offset="0.4" stopColor="#f4f6f8" />
                    <stop offset="1" stopColor="#8d969f" />
                </linearGradient>
                <linearGradient id={`${id}-shaft`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4a515a" />
                    <stop offset="0.45" stopColor="#8a929b" />
                    <stop offset="1" stopColor="#4a515a" />
                </linearGradient>
            </defs>

            {/* the flights behind the dart, then the dart, then those in front */}
            <g>{wings('back')}</g>

            {/* the point: a steel needle, sharp at the tip */}
            <polygon points="0,0 5,-0.8 30,-1.1 30,1.1 5,0.8" fill={`url(#${id}-steel)`} />
            {/* the barrel: its profile, grip and finish */}
            <BarrelArt barrel={barrel} uid={`${id}-barrel`} />
            {/* the shaft, with its ring where it screws in; it ends where the flights begin,
                so its end never shows among them */}
            <rect x="80" y="-1.7" width="22.5" height="3.4" rx="0.4" fill={`url(#${id}-shaft)`} />
            <rect x="80" y="-2.2" width="3" height="4.4" rx="0.6" fill={`url(#${id}-shaft)`} />

            <g>{wings('front')}</g>
        </g>
    );
};

/**
 * The dart from the side: turning slowly as the preview of a player's darts,
 * or still (spin false), e.g. in the header of their statistics.
 */
const DartSide = ({ spin = true, ...props }) => (
    <svg className="dart-side" viewBox="-3 -17 138 34" role="img" aria-label="A dart with these flights">
        <DartProfile {...props} spin={spin} />
    </svg>
);

// the set of three: each from its point, fanned out, turned a little differently
const SET = [{ x: -9, angle: -101, turn: 20 }, { x: 0, angle: -90, turn: 45 }, { x: 9, angle: -79, turn: 70 }];

/**
 * A player's set of three darts, as on the packet: points down, flights fanned
 * out at the top, standing still.
 */
export const DartSet = (props) => (
    <svg className="dart-set" viewBox="-52 -140 104 146" role="img" aria-label="A set of three darts with these flights">
        {SET.map(dart => (
            <g key={dart.x} transform={`translate(${dart.x}, 0) rotate(${dart.angle})`}>
                <DartProfile {...props} turn={dart.turn} />
            </g>
        ))}
    </svg>
);

export default DartSide;
