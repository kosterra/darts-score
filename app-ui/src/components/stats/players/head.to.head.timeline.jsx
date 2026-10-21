import { useRef, useState } from 'react';
import { Avatar } from 'primereact/avatar';
import { FaTrophy } from 'react-icons/fa6';
import dayjs from 'dayjs';

import ChartConfigOptions from '../common/chart.config.options';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';
import { t } from '../../../utils/i18n';

const MAX_GAMES = 12;
// the card is this wide at most; near the edges it stays inside the timeline
const CARD_HALF = 110;

/**
 * The latest games of a comparison on one line, oldest left, newest right:
 * each stop shows the winner in their chart colour. Hovering (or focusing) a
 * stop shows the game in the tooltip card of the charts: the date, every
 * player with their colour and sets or points, and a trophy for the winner.
 */
const HeadToHeadTimeline = ({ games = [], players = [] }) => {
    const wrapper = useRef(null);
    const [hovered, setHovered] = useState(null);

    const recent = [...games]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .slice(-MAX_GAMES);
    if (recent.length === 0) return null;

    const colourOf = (playerId) => {
        const index = players.findIndex(player => player.id === playerId);
        return index === -1 ? 'var(--shade600)' : ChartConfigOptions.fillColors.values[index];
    };

    // the card below the stop, kept inside the timeline at both ends
    const show = (index, event) => {
        const box = wrapper.current?.getBoundingClientRect();
        const stop = event.currentTarget.getBoundingClientRect();
        if (!box) return;
        const centre = stop.left + stop.width / 2 - box.left;
        const align = centre < CARD_HALF ? 'start' : centre > box.width - CARD_HALF ? 'end' : 'middle';
        setHovered({ index, centre, top: stop.bottom - box.top + 6, align });
    };

    const hoveredGame = hovered ? recent[hovered.index] : null;
    const isX01Game = (game) => game.startingScore != null;

    return (
        <div className="h2h-timeline-wrap" ref={wrapper}>
            <div className="h2h-timeline" role="list" aria-label={t('Latest games, newest on the right')}>
                {recent.map((game, index) => {
                    const winnerId = game.players.find(id => game.playerModels?.[id]?.hasWonGame);
                    const winner = players.find(player => player.id === winnerId);
                    // X01 games show the sets and starting score, Cricket and Elimination the points
                    const isX01 = isX01Game(game);
                    const result = game.players
                        .map(id => (isX01 ? game.playerModels?.[id]?.setsWon : game.playerModels?.[id]?.score) ?? 0)
                        .join(' : ');
                    const summary = `${dayjs(game.updatedAt).format('DD.MM.YYYY')}${isX01 ? ` · ${game.startingScore}` : ''} · ${winner ? t('{{nickname}} won', { nickname: winner.nickname }) : t('Winner not in this comparison')} (${isX01 ? t('sets') : t('points')} ${result})`;
                    const isLatest = index === recent.length - 1;

                    return (
                        <div
                            key={game.id}
                            role="listitem"
                            tabIndex={0}
                            className={`h2h-stop ${isLatest ? 'latest' : ''}`}
                            style={{ '--winner-colour': colourOf(winnerId), animationDelay: `${index * 60}ms` }}
                            aria-label={summary}
                            onMouseEnter={(event) => show(index, event)}
                            onFocus={(event) => show(index, event)}
                            onMouseLeave={() => setHovered(null)}
                            onBlur={() => setHovered(null)}
                        >
                            <Avatar
                                label={winner ? resolvePlayerInitials(winner.firstname, winner.lastname) : '?'}
                                image={winner ? resolvePlayerImg(winner.profileImg) : undefined}
                                shape="circle"
                                className="h2h-winner bg-surface-high"
                            />
                            <span className="h2h-dot" aria-hidden="true" />
                            <span className="h2h-date text-faint">{dayjs(game.updatedAt).format('DD.MM.')}</span>
                        </div>
                    );
                })}
            </div>

            {hoveredGame &&
                <div
                    className={`chart-tooltip h2h-tooltip is-${hovered.align}`}
                    style={{ left: hovered.centre, top: hovered.top }}
                    role="tooltip"
                >
                    <div className="chart-tooltip-label">
                        {dayjs(hoveredGame.updatedAt).format('DD.MM.YYYY')}
                        {isX01Game(hoveredGame) && ` · ${hoveredGame.startingScore}`}
                    </div>
                    {hoveredGame.players.map(id => {
                        const player = players.find(entry => entry.id === id);
                        const model = hoveredGame.playerModels?.[id] ?? {};
                        const value = isX01Game(hoveredGame)
                            ? `${model.setsWon ?? 0} ${(model.setsWon ?? 0) === 1 ? 'set' : 'sets'}`
                            : t('{{value}} points', { value: model.score ?? 0 });
                        return (
                            <div key={id} className="chart-tooltip-row">
                                <span className="chart-tooltip-dot" style={{ background: colourOf(id) }} />
                                <span className="chart-tooltip-name">
                                    {player?.nickname ?? t('Other player')}
                                    {model.hasWonGame && <FaTrophy className="h2h-tooltip-trophy" aria-label={t('Winner')} />}
                                </span>
                                <span className="chart-tooltip-value">{value}</span>
                            </div>
                        );
                    })}
                </div>
            }
        </div>
    );
};

export default HeadToHeadTimeline;
