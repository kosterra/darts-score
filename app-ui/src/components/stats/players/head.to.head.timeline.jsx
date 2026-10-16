import { Avatar } from 'primereact/avatar';
import { Tooltip } from 'primereact/tooltip';
import dayjs from 'dayjs';

import ChartConfigOptions from '../common/chart.config.options';
import { resolvePlayerImg, resolvePlayerInitials } from '../../../utils/image.utils';

const MAX_GAMES = 12;

/**
 * The latest games of a comparison on one line, oldest left, newest right:
 * each stop shows the winner in their chart colour.
 */
const HeadToHeadTimeline = ({ games = [], players = [] }) => {
    const recent = [...games]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .slice(-MAX_GAMES);
    if (recent.length === 0) return null;

    const colourOf = (playerId) => {
        const index = players.findIndex(player => player.id === playerId);
        return index === -1 ? 'var(--shade600)' : ChartConfigOptions.fillColors.values[index];
    };

    return (
        <div className="h2h-timeline" role="list" aria-label="Latest games, newest on the right">
            <Tooltip target=".h2h-stop" position="top" />
            {recent.map((game, index) => {
                const winnerId = game.players.find(id => game.playerModels?.[id]?.hasWonGame);
                const winner = players.find(player => player.id === winnerId);
                // X01 games show the sets and starting score, Cricket and Elimination the points
                const isX01 = game.startingScore != null;
                const result = game.players
                    .map(id => (isX01 ? game.playerModels?.[id]?.setsWon : game.playerModels?.[id]?.score) ?? 0)
                    .join(' : ');
                const tooltip = `${dayjs(game.updatedAt).format('DD.MM.YYYY')}${isX01 ? ` · ${game.startingScore}` : ''} · ${winner ? `${winner.nickname} won` : 'Winner not in this comparison'} (${isX01 ? 'sets' : 'points'} ${result})`;
                const isLatest = index === recent.length - 1;

                return (
                    <div
                        key={game.id}
                        role="listitem"
                        className={`h2h-stop ${isLatest ? 'latest' : ''}`}
                        style={{ '--winner-colour': colourOf(winnerId), animationDelay: `${index * 60}ms` }}
                        data-pr-tooltip={tooltip}
                        aria-label={tooltip}
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
    );
};

export default HeadToHeadTimeline;
