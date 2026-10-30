import { GAME_TYPE_LABELS as LABELS } from '../../utils/game.format';

/**
 * Label for a game type, each type in its own colour.
 */
const GameTypeTag = ({ type }) => (
    <span className={`game-type-tag game-type-${type}`}>{LABELS[type] ?? type}</span>
);

export default GameTypeTag;
