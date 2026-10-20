import { useEffect, useId, useRef } from 'react';

import { FlightArt } from '../flights/flight.art';

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
 * A dart seen from the side, tip to the left: the steel point, the barrel
 * with its grip rings, the shaft and the four flights, turning slowly round
 * the dart's axis (the flights across the line of sight get narrow, those
 * behind it darker). color, shape and design: the flights, as on the board.
 */
const DartSide = ({ color, shape = 'standard', design = 'plain' }) => {
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
        place(START_TURN);
        if (reducedMotion()) return undefined;
        let frame;
        const start = performance.now();
        const step = (now) => {
            place(START_TURN + ((now - start) / 1000 / TURN_SECONDS) * 360);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [shape, design, color]);

    const wings = (layer) => ANGLES.map(angle => (
        <g key={angle} ref={element => { wingRefs.current[`${layer}-${angle}`] = element; }} transform={wingTransform(angle, 0)}>
            <FlightArt shape={shape} design={design} color={color} uid={`${id}-${layer}-${angle}`} half={angle % 180 === 0 ? 'upper' : 'lower'} shadeRef={element => { shadeRefs.current[`${layer}-${angle}`] = element; }} />
        </g>
    ));

    return (
        <svg className="dart-side" viewBox="-3 -17 138 34" role="img" aria-label="A dart with these flights">
            <defs>
                {/* lit from the front, as the flights: the metal is the same shade at its upper and
                    lower edge, so it looks as centred on the dart as it is (a dark lower edge would
                    vanish into the background and make the flights look too low) */}
                <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8d969f" />
                    <stop offset="0.4" stopColor="#f4f6f8" />
                    <stop offset="1" stopColor="#8d969f" />
                </linearGradient>
                <linearGradient id={`${id}-barrel`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7d8791" />
                    <stop offset="0.38" stopColor="#dfe4e9" />
                    <stop offset="0.62" stopColor="#b3bcc5" />
                    <stop offset="1" stopColor="#7d8791" />
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
            {/* the barrel: tungsten, rounded at both ends, with grip rings */}
            <path d="M 30,-2.2 Q 34,-3.9 40,-3.9 L 72,-3.9 Q 78,-3.9 80,-2.6 L 80,2.6 Q 78,3.9 72,3.9 L 40,3.9 Q 34,3.9 30,2.2 Z" fill={`url(#${id}-barrel)`} />
            {Array.from({ length: 9 }, (_, index) => 44 + index * 3).map(x => (
                <line key={x} x1={x} y1="-3.9" x2={x} y2="3.9" className="dart-side-ring" />
            ))}
            {/* the shaft, with its ring where it screws in, into the flights */}
            <rect x="80" y="-1.7" width="34" height="3.4" rx="1" fill={`url(#${id}-shaft)`} />
            <rect x="80" y="-2.2" width="3" height="4.4" rx="0.6" fill={`url(#${id}-shaft)`} />

            <g>{wings('front')}</g>
        </svg>
    );
};

export default DartSide;
