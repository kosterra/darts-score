import { Fragment } from 'react';
import { FaTrophy } from "react-icons/fa";
import { t } from '../../../utils/i18n';

/**
 * The players of a game with their result, in columns so the figures line up:
 * the names, then in X01 the sets and the legs won (only the legs with
 * withSets false, e.g. the quick games of a darts evening), the other games
 * the score.
 */
const GamePlayers = ({ game, players, withSets = true }) => {
    const x01 = game.type === 'x01';
    const figures = x01 && withSets ? 2 : 1;
    return (
        <div className="game-players" style={{ '--figures': figures }}>
            {game.players.map(entry => {
                // every name and number is semibold; the winner stands out by colour and trophy
                const tone = entry.isWinner ? 'text-default' : 'text-subtle';
                return (
                    <Fragment key={entry.player}>
                        <span className={`game-players-name fs-7 fw-semibold ${tone}`}>
                            {players.get(entry.player)?.nickname ?? t('Unknown')}
                            {entry.isWinner && <FaTrophy className="ms-1 text-gold" aria-label={t('Winner')} />}
                        </span>
                        {x01
                            ? (
                                <>
                                    {withSets && <span className="text-faint fs-8 text-nowrap"><span className="text-default fs-7 fw-semibold tabular-nums">{entry.sets}</span> {entry.sets === 1 ? t('set') : t('sets')}</span>}
                                    <span className="text-faint fs-8 text-nowrap"><span className="text-default fs-7 fw-semibold tabular-nums">{entry.legs}</span> {entry.legs === 1 ? t('leg') : t('legs')}</span>
                                </>
                            )
                            : <span className="text-default fs-7 fw-semibold tabular-nums text-nowrap">{entry.score ?? '–'}</span>
                        }
                    </Fragment>
                );
            })}
        </div>
    );
};

export default GamePlayers;
