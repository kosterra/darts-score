import { useEffect, useId, useState } from 'react';

import { secondColorOf } from '../../utils/flights';

// one flight seen from the side, per shape: x along the dart from where it
// sits on the shaft, y outwards from the dart's axis
const WINGS = {
    standard: 'M 0,0 L 4,2.6 L 14,10.6 L 25,13.6 L 29,14 L 30,12.5 L 30,0 Z',
    slim: 'M 0,0 L 6,2 L 18,6.6 L 27,8.2 L 30,7.6 L 30,0 Z',
    kite: 'M 0,0 L 18,13.6 L 22,13.6 L 30,3.5 L 30,0 Z',
    pear: 'M 0,0 C 6,2 10,5 14,9 C 18,13.6 27,15.4 30,11 L 30,0 Z',
};
// the parts a pattern paints in the second colour, cut to the flight: its back end, a band across it
const WING_TIP = '23,0 31,0 31,16 23,16';
const WING_STRIPE = '12,0 15.5,0 19.5,16 16,16';
// where the flights sit on the dart, and how fast it turns (one turn in seconds)
const FLIGHTS_AT = 102;
const TURN_SECONDS = 5;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A dart seen from the side, tip to the left: the steel point, the barrel
 * with its grip rings, the shaft and the four flights, turning slowly round
 * the dart's axis (the flights across the line of sight get narrow, those
 * behind it darker). color and pattern: the flights, as on the board.
 */
const DartSide = ({ color, pattern = 'plain', shape = 'standard' }) => {
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

    const second = secondColorOf(color);
    const wing = WINGS[shape] ?? WINGS.standard;
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
                <clipPath id={`${id}-wing`}><path d={wing} /></clipPath>
                <linearGradient id={`${id}-shaft`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5a616b" />
                    <stop offset="1" stopColor="#15181c" />
                </linearGradient>
            </defs>

            {/* the flights behind the dart first, then the dart, then those in front */}
            {wings.filter(turned => turned.depth < 0).map(turned => <Wing key={turned.angle} turned={turned} shape={wing} clip={`${id}-wing`} color={color} second={second} pattern={pattern} />)}

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

            {wings.filter(turned => turned.depth >= 0).map(turned => <Wing key={turned.angle} turned={turned} shape={wing} clip={`${id}-wing`} color={color} second={second} pattern={pattern} />)}
        </svg>
    );
};

// one flight at its angle: squeezed to how far it reaches up or down, darker behind the dart
const Wing = ({ turned, shape, clip, color, second, pattern }) => (
    <g transform={`translate(${FLIGHTS_AT}, 0) scale(1, ${-turned.reach})`} className={turned.depth < 0 ? 'dart-side-wing is-back' : 'dart-side-wing'}>
        <path d={shape} fill={pattern === 'twoTone' && turned.angle % 180 ? second : color} className="dart-side-flight" />
        {pattern === 'tipped' && <polygon points={WING_TIP} fill={second} clipPath={`url(#${clip})`} />}
        {pattern === 'striped' && <polygon points={WING_STRIPE} fill={second} clipPath={`url(#${clip})`} />}
    </g>
);

export default DartSide;
