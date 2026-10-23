import { FaTrophy } from "react-icons/fa";

import GameTypeTag from '../elements/game.type.tag';
import GameStatusTag from '../elements/game.status.tag';
import { t } from '../../utils/i18n';

/**
 * One running or finished game on the public start page.
 */
const PublicGameCard = ({ game, live }) => {
    return (
        <div className="bg-surface-raised rounded-2 p-3 h-100 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="d-flex flex-column min-w-0">
                    <span className="text-default fw-semibold text-break">{game.club}</span>
                    <span className="text-faint fs-8">{game.format}</span>
                </div>
                <span className="d-flex flex-wrap justify-content-end gap-1 flex-shrink-0">
                    <GameTypeTag type={game.type} />
                    <GameStatusTag running={live} label={t('Live')} />
                </span>
            </div>
            <div className="d-flex flex-column gap-2">
                {game.players.map((player, idx) => (
                    <div
                        key={idx}
                        className={`d-flex justify-content-between align-items-center gap-3 rounded-1 px-2 py-1 ${player.isTurn ? 'bg-surface-high' : ''}`}
                    >
                        <span className={`text-break ${player.isWinner ? 'text-default fw-semibold' : 'text-subtle'}`}>
                            {player.name}
                            {player.isWinner && <FaTrophy className="ms-2 text-gold" aria-label={t('Winner')} />}
                        </span>
                        <span className="d-flex align-items-baseline gap-3 flex-shrink-0 tabular-nums">
                            {game.type === 'x01' &&
                                <span className="text-faint fs-8">
                                    {player.sets} {player.sets === 1 ? t('set') : t('sets')} · {player.legs} {player.legs === 1 ? t('leg') : t('legs')}
                                </span>
                            }
                            <span className="text-default fw-semibold fs-5">{player.score ?? '–'}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PublicGameCard;
