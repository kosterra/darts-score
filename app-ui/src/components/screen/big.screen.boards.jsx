import CountryFlag from '../elements/country.flag';
import { BigScreenTop } from './big.screen.games';
import { t } from '../../utils/i18n';

// a board just called is "fresh" for a few minutes: its players should be on their way
const FRESH_MS = 3 * 60 * 1000;

// as many boards in a row as reads well from across the room
const columnsFor = (count) => (count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4);

const STATUS_WORDS = { called: t('Called'), playing: t('Live'), free: t('Board free'), out: t('Taken out') };

// the sets (when played in sets) or the legs won so far
const wonOf = (board, side) => board.sets?.[side] ?? board.legs?.[side] ?? null;

/**
 * The big screen of the boards of a tournament or a club night: a tile per
 * board with its number large, the players, the legs of a game going on and
 * a gold "Called" for a match just called, and the next up beside them.
 * answer: from GET /api/screen/:token (kind tournamentBoards or nightBoards).
 */
const BigScreenBoards = ({ answer }) => {
    const title = answer.kind === 'nightBoards' ? t(answer.title ?? 'Club night') : answer.title;
    const boards = answer.boards ?? [];
    return (
        <div className="big-screen big-screen-boards">
            <BigScreenTop club={answer.club} title={title} detail={answer.club ? title : null} />
            <div className="big-boards">
                <div className="big-boards-grid" style={{ '--columns': columnsFor(boards.length) }}>
                    {boards.map(board => {
                        const status = board.out && board.status !== 'playing' ? 'out' : board.status;
                        const fresh = status === 'called' && board.calledAt && Date.now() - new Date(board.calledAt).getTime() < FRESH_MS;
                        return (
                            <section key={board.number} className={`big-board is-${status} ${fresh ? 'is-fresh' : ''}`} aria-label={t('Board {{number}}', { number: board.number })}>
                                <div className="big-board-head">
                                    <span className="big-board-number">{t('Board {{number}}', { number: board.number })}</span>
                                    <span className={`big-board-badge is-${fresh ? 'fresh' : status}`}>{STATUS_WORDS[status]}</span>
                                </div>
                                {board.round && <span className="text-subtle big-board-round">{t(board.round)}</span>}
                                {board.players.length
                                    ? board.players.map((player, side) => (
                                        <span key={player.id} className="big-board-player">
                                            <span className="big-board-flag">{player.country && <CountryFlag code={player.country} />}</span>
                                            <span className="big-board-name">{player.nickname}</span>
                                            {status === 'playing' && wonOf(board, side) != null && <span className="big-board-legs">{wonOf(board, side)}</span>}
                                            {status === 'playing' && board.score?.[side] != null && <span className="big-board-score">{board.score[side]}</span>}
                                        </span>
                                    ))
                                    : <span className="big-board-free">{board.out ? t('Not played on for now.') : t('Waiting for the next match.')}</span>}
                            </section>
                        );
                    })}
                </div>
                <aside className="big-boards-next">
                    <h2>{t('Next up')}</h2>
                    {(answer.queue ?? []).length
                        ? (
                            <ol>
                                {answer.queue.map((entry, index) => (
                                    <li key={index}>
                                        <span>{index + 1}</span>
                                        <span className="d-flex flex-column min-w-0">
                                            <span className="text-truncate">{entry.players.map(player => player.nickname).join(' – ')}</span>
                                            {entry.round && <span className="text-faint big-boards-next-round">{t(entry.round)}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )
                        : <p className="text-faint m-0">{t('The queue is empty.')}</p>}
                </aside>
            </div>
        </div>
    );
};

export default BigScreenBoards;
