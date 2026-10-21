import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { GiDart } from "react-icons/gi";
import dayjs from 'dayjs';

import GamePlayers from './game.players';
import GameTypeTag from '../../elements/game.type.tag';
import GameTypeIcon from '../../elements/game.type.icon';

/**
 * Games in progress, each with a button to continue playing.
 */
const RunningGamesWidget = ({ widget, games: running, total, players }) => {
    const navigate = useNavigate();

    return (
        <Panel header={widget.title} className="h-100 dashboard-widget">
            {running.length === 0
                ? <p className="text-subtle fs-7 m-0 p-2">No game is running. Start one from the menu.</p>
                : (
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {running.map(game => (
                            <li key={game.id} className="bg-surface-raised rounded-2 p-3 d-flex align-items-center gap-3">
                                <GameTypeIcon type={game.type} />
                                <div className="d-flex flex-column gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <GameTypeTag type={game.type} />
                                        <span className="text-faint fs-8">{dayjs(game.playedAt).format('DD.MM.YYYY HH:mm')}</span>
                                    </div>
                                    <GamePlayers game={game} players={players} />
                                </div>
                                {/* the icon button of the lists */}
                                <div className="row-actions">
                                    <Button type="button" icon={<GiDart />} aria-label="Continue this game" title="Continue playing" onClick={() => navigate(`/${game.type}/${game.id}`)} />
                                </div>
                            </li>
                        ))}
                        {total > running.length &&
                            <li className="text-faint fs-8 text-center pt-1">
                                and {total - running.length} older {total - running.length === 1 ? 'game' : 'games'} that were never finished
                            </li>
                        }
                    </ul>
                )
            }
        </Panel>
    );
};

export default RunningGamesWidget;
