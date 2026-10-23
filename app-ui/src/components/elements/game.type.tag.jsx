import { GAMES } from '../../rules/games';

const LABELS = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination', clock: 'Around the Clock', ...Object.fromEntries(GAMES.map(game => [game.id, game.title])) };

/**
 * Label for a game type, each type in its own colour.
 */
const GameTypeTag = ({ type }) => (
    <span className={`game-type-tag game-type-${type}`}>{LABELS[type] ?? type}</span>
);

export default GameTypeTag;
