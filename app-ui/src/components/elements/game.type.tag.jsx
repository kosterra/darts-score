const LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination' };

/**
 * Label for a game type, each type in its own colour.
 */
const GameTypeTag = ({ type }) => (
    <span className={`game-type-tag game-type-${type}`}>{LABELS[type] ?? type}</span>
);

export default GameTypeTag;
