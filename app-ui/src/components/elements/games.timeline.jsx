
import { Timeline } from 'primereact/timeline';
import { Avatar } from 'primereact/avatar';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import { ScrollPanel } from 'primereact/scrollpanel';
import { FaTrophy } from 'react-icons/fa6';

import dayjs from 'dayjs';
import { resolvePlayerImg } from '../../utils/image.utils';

const GamesTimeline = (props) => {
    const {
        games = [],
        players = []
    } = props;

    const itemContent = (game) => {
        let player = {};
        for (let i = 0; i < game.players.length; i++) {
            let playerModel = game.playerModels[game.players[i]];
            if (playerModel.hasWonGame) {
                player = players.find(player => player.id === game.players[i]);
            }
        }

        return (
            <Card
                title={game.startingScore}
                subTitle={(player || {}).nickname || 'N/A'}
                className="timeline-card mb-3 p-2">
                <div className="d-flex align-items-center justify-content-center">
                    <div className="position-relative">
                        <Avatar
                            label={(((player || {}).firstname || 'N') + ' ' + ((player || {}).lastname || 'A')).split(" ").map((n) => n[0]).join("")}
                            image={resolvePlayerImg((player || {}).profileImg)}
                            shape="circle"
                            className="avatar-md bg-shade700"
                        />
                        <span className="position-absolute top-75 start-80 translate-middle">
                            <FaTrophy className="fs-5 text-gold mt-2" />
                        </span>
                    </div>
                </div>
            </Card>
        );
    }

    const oppositeContent = (game) => {
        return (
            <small className="text-shade500 fs-8 fw-semibold">
                {dayjs(game.updatedAt).format("DD.MM.YYYY")}
            </small>
        );
    }

    return (
        <>
            { games && games.length > 0 &&
                <Panel>
                    <div className="d-flex flex-column justify-content-center align-items-center">
                        <span className="text-shade100 fs-4 fw-semibold mb-4 mt-4">
                            Timeline
                        </span>
                        <ScrollPanel style={{ height: '20rem' }} className="col-10">
                            <Timeline
                                value={games}
                                content={itemContent}
                                opposite={oppositeContent}
                                align="alternate"
                            />
                        </ScrollPanel>
                    </div>
                </Panel>
            }
        </>
    )
}

export default GamesTimeline;
