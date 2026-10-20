import { DartProfile } from '../../players/dart.side';

// how the dart stands in the board, seen from the oche: its tip in the field, the
// rest towards the thrower, so it looks shorter; leaning a little to the right
const LEAN = 78;
const ALONG = 0.46;
const ACROSS = 0.62;

/**
 * A dart stuck in the board, seen from the oche: its tip at (0, 0) and the
 * rest of it drawn downwards (the board's animation turns it upright as it
 * lands, the tail a little up), as the dart from the side, shortened along
 * its length, so the barrel and the flights look like they do on the
 * player's profile. color, shape and design: the flights; barrel: its barrel.
 */
const Dart = ({ color, shape = 'standard', design = 'plain', barrel = 'classic' }) => (
    <g className="dart-shape">
        {/* its shadow on the board, a little below */}
        <ellipse cx="0" cy="3" rx="3" ry="1.4" className="dart-shadow" />
        <g transform={`rotate(${LEAN}) scale(${ALONG}, ${ACROSS})`}>
            <DartProfile color={color} shape={shape} design={design} barrel={barrel} />
        </g>
    </g>
);

export default Dart;
