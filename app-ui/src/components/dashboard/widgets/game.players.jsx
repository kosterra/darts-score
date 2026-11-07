import { Fragment } from 'react';
import { FaTrophy } from "react-icons/fa";
import PlayLevelTag from '../../elements/play.level.tag';
import { t } from '../../../utils/i18n';

/**
 * The players of a game with their result, in columns so the figures line up:
 * the names, then in X01 the sets won over more than one set (game.inSets),
 * the legs won in one set (and always with withSets false, e.g. the quick
 * games of a darts evening), the other games the score; then the level each
 * played at (entry.level), when the game says. The columns have the same
 * width in every game, so the scores and levels of a list stand one under
 * another; a long name is shortened (the whole name in its tooltip).
 */
const GamePlayers = ({ game, players, withSets = true }) => {
    const x01 = game.type === 'x01';
    const inSets = withSets && Boolean(game.inSets);
    return (
        <div className="game-players">
            {game.players.map(entry => {
                // every name and number is semibold; the winner stands out by colour and trophy
                const tone = entry.isWinner ? 'text-default' : 'text-subtle';
                const name = players.get(entry.player)?.nickname ?? t('Unknown');
                return (
                    <Fragment key={entry.player}>
                        <span className={`game-players-name fs-7 fw-semibold ${tone}`} title={name}>
                            <span className="game-players-nickname">{name}</span>
                            {entry.isWinner && <FaTrophy className="ms-1 text-gold flex-shrink-0" aria-label={t('Winner')} />}
                        </span>
                        {x01
                            ? inSets
                                ? <span className="text-faint fs-8 text-nowrap"><span className="text-default fs-7 fw-semibold tabular-nums">{entry.sets}</span> {entry.sets === 1 ? t('set') : t('sets')}</span>
                                : <span className="text-faint fs-8 text-nowrap"><span className="text-default fs-7 fw-semibold tabular-nums">{entry.legs}</span> {entry.legs === 1 ? t('leg') : t('legs')}</span>
                            : <span className="text-default fs-7 fw-semibold tabular-nums text-nowrap">{entry.score ?? '–'}</span>
                        }
                        {/* an empty cell without a level, so the next player's level stays in its column */}
                        <span className="game-players-level">{entry.level && <PlayLevelTag estimate={{ level: entry.level }} compact />}</span>
                    </Fragment>
                );
            })}
        </div>
    );
};

export default GamePlayers;
