import { useEffect, useId, useState } from 'react';

import { FlightArt } from '../flights/flight.art';

// where the flights sit on the dart, and how fast it turns (one turn in seconds)
const FLIGHTS_AT = 102;
const TURN_SECONDS = 5;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A dart seen from the side, tip to the left: the steel point, the barrel
 * with its grip rings, the shaft and the four flights, turning slowly round
 * the dart's axis (the flights across the line of sight get narrow, those
 * behind it darker). color, shape and design: the flights, as on the board.
 */
const DartSide = ({ color, shape = 'standard', design = 'plain' }) => {
    const id = useId().replace(/:/g, '');
    // the dart's turn round its axis, in degrees
    const [turn, setTurn] = useState(30);

    useEffect(() => {
        if (reducedMotion()) return undefined;
        let frame;
        const start = performance.now();
        const step = (now) => {
            setTurn(30 + ((now - start) / 1000 / TURN_SECONDS) * 360);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, []);

    // the four flights at their angle now: how far they reach up (or down) and whether they are in front
    const wings = [0, 90, 180, 270]
        .map(angle => {
            const radians = ((turn + angle) * Math.PI) / 180;
            return { angle, reach: Math.sin(radians), depth: Math.cos(radians) };
        })
        .sort((a, b) => a.depth - b.depth);

    return (
        <svg className="dart-side" viewBox="-3 -17 138 34" role="img" aria-label="A dart with these flights">
            <defs>
                <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f4f6f8" />
                    <stop offset="0.45" stopColor="#b9c1c9" />
                    <stop offset="1" stopColor="#5d6670" />
                </linearGradient>
                <linearGradient id={`${id}-barrel`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#d5dbe1" />
                    <stop offset="0.35" stopColor="#9aa5b1" />
                    <stop offset="1" stopColor="#3f4750" />
                </linearGradient>
                <linearGradient id={`${id}-shaft`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5a616b" />
                    <stop offset="1" stopColor="#15181c" />
                </linearGradient>
            </defs>

            {/* the flights behind the dart first, then the dart, then those in front */}
            {wings.filter(turned => turned.depth < 0).map(turned => <Wing key={turned.angle} turned={turned} uid={`${id}-${turned.angle}`} color={color} shape={shape} design={design} />)}

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

            {wings.filter(turned => turned.depth >= 0).map(turned => <Wing key={turned.angle} turned={turned} uid={`${id}-${turned.angle}`} color={color} shape={shape} design={design} />)}
        </svg>
    );
};

// one flight at its angle: half of the flat drawing (a sheet makes two opposite wings),
// squeezed to how far it reaches up or down, darker behind the dart
const Wing = ({ turned, uid, color, shape, design }) => {
    const upper = turned.angle % 180 === 0;
    return (
        <g transform={`translate(${FLIGHTS_AT}, 0) scale(0.3, ${(upper ? 0.35 : -0.35) * turned.reach})`} className={turned.depth < 0 ? 'dart-side-wing is-back' : 'dart-side-wing'}>
            <FlightArt shape={shape} design={design} color={color} uid={uid} half={upper ? 'upper' : 'lower'} />
        </g>
    );
};

export default DartSide;
