import { useRef } from 'react';
import { Avatar } from 'primereact/avatar';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { DataScroller } from 'primereact/datascroller';
import { FaChartBar, FaTrophy } from "react-icons/fa";
import { GiDart } from "react-icons/gi";

import dayjs from "dayjs";
import { resolvePlayerImg } from '../../utils/image.utils';

const DashboardGameList = (props) => {
    const {
        title = '',
        subtitle = '',
        gamesType = 'x01',
        emptyMessage = 'No records found',
        games = [],
        players = []
    } = props;

    const ds = useRef(null);

    const headerTemplate = () => {
        return (
            <div className="p-panel-header" >
                <div>
                    <div className="text-center fs-6 fw-semibold">{title}</div>
                    <div className="text-center fs-8 fw-medium">{subtitle}</div>
                </div>
            </div>
        );
    };

    const x01Template = (game) => {
        return (
            <>
                <div className="row mb-2">
                    <div className={`${game.gameIsRunning ? "col-6" : "col-9"}`}>
                        {' '}
                    </div>
                    <div className={`col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold`}>
                        Sets
                    </div>
                    {game.gameIsRunning &&
                        <div className="col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold">
                            Legs
                        </div>
                    }
                </div>
                {players.length > 0 && game.players.map((playerId, idx) => (
                    <div className="row" key={idx}>
                        <div className={`${game.gameIsRunning ? "col-6" : "col-9"} d-flex align-items-center text-default fs-7 fw-semibold`}>
                            <Avatar
                                label={(((players || []).find(player => player.id === playerId) || {}).firstname + ' ' + ((players || []).find(player => player.id === playerId) || {}).lastname).split(" ").map((n) => n[0]).join("")}
                                image={resolvePlayerImg(((players || []).find(player => player.id === playerId) || {}).profileImg)}
                                shape="circle"
                                className="avatar-sm bg-surface-high m-2 me-4"
                            />
                            {((players || []).find(player => player.id === playerId) || {}).nickname || 'N / A'}
                            {game.playerModels[playerId].hasWonGame &&
                                <FaTrophy className="ms-2 text-gold fs-6" />
                            }
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold">
                            {game.playerModels[playerId].setsWon}
                        </div>
                        {game.gameIsRunning &&
                            <div className="col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold">
                                {game.playerModels[playerId].currentSetLegsWon}
                            </div>
                        }
                    </div>
                ))}
            </>
        );
    }

    const cricketTemplate = (game) => {
        return (
            <>
                <div className="row mb-2">
                    <div className={`${game.gameIsRunning ? "col-6" : "col-9"}`}>
                        {' '}
                    </div>
                    <div className="col-3 d-flex align-items-center justify-content-center text-default fs-8 fw-semibold">
                        {game.gameIsRunning ? 'Score' : 'End Score'}
                    </div>
                </div>
                {players.length > 0 && game.players.map((playerId, idx) => (
                    <div className="row" key={idx}>
                        <div className={`${game.gameIsRunning ? "col-6" : "col-9"} d-flex align-items-center text-default fs-7 fw-semibold`}>
                            <Avatar
                                label={(((players || []).find(player => player.id === playerId) || {}).firstname + ' ' + ((players || []).find(player => player.id === playerId) || {}).lastname).split(" ").map((n) => n[0]).join("")}
                                image={resolvePlayerImg(((players || []).find(player => player.id === playerId) || {}).profileImg)}
                                shape="circle"
                                className="avatar-sm bg-surface-high m-2 me-4"
                            />
                            {((players || []).find(player => player.id === playerId) || {}).nickname || 'N / A'}
                            {game.playerModels[playerId].hasWonGame &&
                                <FaTrophy className="ms-2 text-gold fs-6" />
                            }
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold">
                            {game.playerModels[playerId].score}
                        </div>
                    </div>
                ))}
            </>
        );
    }

    const eliminationTemplate = (game) => {
        return (
            <>
                <div className="row mb-2">
                    <div className={`${game.gameIsRunning ? "col-6" : "col-9"}`}>
                        {' '}
                    </div>
                    <div className="col-3 d-flex align-items-center justify-content-center text-default fs-8 fw-semibold">
                        {game.gameIsRunning ? 'Score' : 'End Score'}
                    </div>
                </div>
                {players.length > 0 && game.players.map((playerId, idx) => (
                    <div className="row" key={idx}>
                        <div className={`${game.gameIsRunning ? "col-6" : "col-9"} d-flex align-items-center text-default fs-7 fw-semibold`}>
                            <Avatar
                                label={(((players || []).find(player => player.id === playerId) || {}).firstname + ' ' + ((players || []).find(player => player.id === playerId) || {}).lastname).split(" ").map((n) => n[0]).join("")}
                                image={resolvePlayerImg(((players || []).find(player => player.id === playerId) || {}).profileImg)}
                                shape="circle"
                                className="avatar-sm bg-surface-high m-2 me-4"
                            />
                            {((players || []).find(player => player.id === playerId) || {}).nickname || 'N / A'}
                            {game.playerModels[playerId].hasWonGame &&
                                <FaTrophy className="ms-2 text-gold fs-6" />
                            }
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center text-default fs-7 fw-semibold">
                            {game.playerModels[playerId].score}
                        </div>
                    </div>
                ))}
            </>
        );
    }

    const itemTemplate = (game) => {
        return (
            <div>
                <div className="col-12 d-flex flex-column justify-content-center">
                    {gamesType == 'x01' &&
                        x01Template(game)
                    }
                    {gamesType == 'cricket' &&
                        cricketTemplate(game)
                    }
                    {gamesType == 'elimination' &&
                        eliminationTemplate(game)
                    }
                </div>
                <div className="d-flex justify-content-between align-items-end mt-4">
                    <span className="fs-9 text-faint">{dayjs(game.createdAt).format("DD.MM.YYYY HH:mm")}</span>
                    {!game.gameIsRunning &&
                        <a href={'/' + gamesType + '/' + game.id} rel="noopener noreferrer" className="p-button font-bold">
                            <FaChartBar title="Show Statistics" />
                        </a>
                    }

                    {game.gameIsRunning &&
                        <a href={'/' + gamesType + '/' + game.id} rel="noopener noreferrer" className="p-button font-bold">
                            <GiDart title="Continue Playing" />
                        </a>
                    }
                </div>
            </div>
        );
    };

    const footerTemplate = () => {
        if (games.length == 0) {
            return null;
        }

        return (
            <div className="mt-3">
                <Button type="text" icon="pi pi-plus" size="small" label="Load More" onClick={() => ds.current.load()} />
            </div>
        );
    };

    const emptyMessageTemplate = () => {
        return (
            <div>
                <span className="text-subtle fs-8 fw-normal">{emptyMessage}</span>
            </div>
        );
    };


    return (
        <div className="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
            <Panel headerTemplate={headerTemplate} className="mx-auto" >
                <DataScroller ref={ds} value={games} itemTemplate={itemTemplate} emptyMessage={emptyMessageTemplate()} rows={5} loader footer={footerTemplate()} />
            </Panel>
        </div>
    );
};

export default DashboardGameList;