import HeadToHeadTimeline from './head.to.head.timeline';
import StatTile from './stat.tile';

/**
 * The top of a head to head: the latest winners over the whole width, then
 * the players' figures ("children") centred in the panel, with the number of
 * games together beside them, level with their top.
 */
const HeadToHeadLayout = ({ gamesTogether, games, players, children }) => (
    <div className="d-flex flex-column gap-3">
        <div style={{ minWidth: 0 }}>
            <span className="text-faint fs-8">Latest winners</span>
            <HeadToHeadTimeline games={games} players={players} />
        </div>
        <div className="h2h-body">
            <div className="h2h-games">
                <StatTile label="Games together" value={gamesTogether} />
            </div>
            <div className="h2h-figures">{children}</div>
        </div>
    </div>
);

export default HeadToHeadLayout;
