import { FaTrophy } from "react-icons/fa";

/**
 * The players of a game with their result, on one wrapping line.
 * X01 shows sets and legs won, the other games the score.
 */
const GamePlayers = ({ game, players }) => {
    return (
        <div className="d-flex flex-wrap column-gap-4 row-gap-1">
            {game.players.map(entry => (
                // every name and number is semibold; the winner stands out by colour and trophy
                <span key={entry.player} className={`fs-7 fw-semibold ${entry.isWinner ? 'text-default' : 'text-subtle'}`}>
                    {players.get(entry.player)?.nickname ?? 'Unknown'}
                    {entry.isWinner && <FaTrophy className="ms-1 text-gold" aria-label="Winner" />}
                    {game.type === 'x01'
                        ? (
                            <span className="ms-2 text-faint fs-8 fw-normal">
                                <span className="text-default fs-7 fw-semibold">{entry.sets}</span> {entry.sets === 1 ? 'set' : 'sets'} · <span className="text-default fs-7 fw-semibold">{entry.legs}</span> {entry.legs === 1 ? 'leg' : 'legs'}
                            </span>
                        )
                        : <span className="ms-2 text-default fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.score ?? '–'}</span>
                    }
                </span>
            ))}
        </div>
    );
};

export default GamePlayers;
