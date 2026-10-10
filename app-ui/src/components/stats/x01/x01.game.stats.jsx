import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import { Panel } from 'primereact/panel';
import { TabView, TabPanel } from 'primereact/tabview';
import { PiShuffle } from "react-icons/pi";
import { PiUserSwitch } from "react-icons/pi";
import { MdReplay } from "react-icons/md";

import StatsService from '../../../services/stats.service';
import PlayerService from '../../../services/player.service';
import X01Models from '../../../models/x01.models';
import X01Service from '../../../services/x01.service';
import X01StatsScoreBoard from './x01.stats.scoreboard';
import X01StatsScoreBoardMultiple from './x01.stats.scoreboard.multiple';
import X01StatsTab from './x01.stats.tab';
import X01StatsCharts from './x01.stats.charts';
import X01GameHeader from '../../games/x01/x01.game.header';
import PageLoader from '../../elements/page.loader';

const X01GameStats = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);
    const [gameStats, setGameStats] = useState({});

    useEffect(() => {
        const loadData = async () => {
            try {
                const gameData = await X01Service.loadX01GameById(id);
                if (!gameData) return;

                const playerData = (await PlayerService.findPlayersByIds(gameData.players))
                    .filter(p => gameData.players.includes(p.id))
                    .sort((a, b) => gameData.players.indexOf(a.id) - gameData.players.indexOf(b.id));

                const statsData = await StatsService.loadX01GameStats(gameData.id);

                setGame(gameData);
                setPlayers(playerData);
                setGameStats(statsData);
            } catch (err) {
                console.error('Failed to load game data', err);
            }
        };

        loadData();
        // eslint-disable-next-line
    }, [id]);

    const onNewGame = () => navigate("/x01", { replace: true });
    const onFinishGame = () => navigate("/", { replace: true });

    const onRestartGame = async (switchPlayers = false, shufflePlayers = false) => {
        if (!game) return;

        const newMatchSetup = {
            ...X01Models.X01GameModel,
            isSoloGame: game.players.length === 1,
            startingScore: game.startingScore,
            setMode: game.setMode,
            legMode: game.legMode,
            legInMode: game.legInMode,
            legOutMode: game.legOutMode,
            numberOfSets: game.numberOfSets,
            numberOfLegs: game.numberOfLegs,
            numberOfPlayers: game.players.length
        };

        let newPlayers = [...game.players];
        if (switchPlayers) newPlayers.reverse();
        if (shufflePlayers) newPlayers.sort(() => Math.random() - 0.5);
        newMatchSetup.players = newPlayers;

        const startingPlayer = newPlayers[0];
        newMatchSetup.startingPlayerLeg = startingPlayer;
        newMatchSetup.startingPlayerSet = startingPlayer;
        newMatchSetup.currentPlayerTurn = startingPlayer;

        newMatchSetup.playerModels = newPlayers.reduce((acc, player) => {
            acc[player] = { ...X01Models.X01PlayerModel, score: Number(game.startingScore) };
            return acc;
        }, {});

        const newGame = await X01Service.createX01Game(newMatchSetup);
        navigate(`/x01/${newGame.id}`);
    };

    const tabHeaderTemplate = ({ index, onClick }) => (
        <div className="d-flex align-items-center text-shade500 gap-2 p-3 cursor-pointer" onClick={onClick}>
            <Badge size="large" severity="secondary" value={index === 0 ? 'A' : index} />
            <span className="fw-bold fs-6">{index === 0 ? 'Overall' : `Set`}</span>
        </div>
    );

    if (!game || !players) return <PageLoader />;

    return (
        <div className="container-fluid p-4 pt-0 border-0">
            <X01GameHeader
                setMode={game.setMode}
                numberOfSets={game.numberOfSets}
                legMode={game.legMode}
                numberOfLegs={game.numberOfLegs}
                legInMode={game.legInMode}
                legOutMode={game.legOutMode}
            />

            <div className="row d-flex justify-content-center align-items-center">
                <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8">
                    {game.players.length === 2
                        ? <X01StatsScoreBoard players={players} game={game} />
                        : <X01StatsScoreBoardMultiple players={players} game={game} />
                    }
                </div>
            </div>

            <div className="row d-flex justify-content-center align-items-center mt-3">
                <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8 px-0 rounded-2">
                    <Panel>
                        <TabView>
                            <TabPanel header="Overall" headerTemplate={tabHeaderTemplate}>
                                <X01StatsTab valueKey="game" game={game} gameStats={gameStats} />
                            </TabPanel>

                            {[...Array(game.setsPlayed)].map((_, i) => (
                                <TabPanel key={`set-tab-${i}`} header={`Set ${i + 1}`} headerTemplate={tabHeaderTemplate}>
                                    <X01StatsTab valueKey={`set-${i + 1}`} game={game} />
                                </TabPanel>
                            ))}
                        </TabView>
                    </Panel>
                </div>
            </div>

            <div className="row d-flex justify-content-center align-items-center mt-4">
                <div className="col-xs-12 col-sm-12 col-md-10 col-lg-8 px-0 rounded-2">
                    <X01StatsCharts
                        avg={gameStats?.avg || []}
                        sectionHits={gameStats?.sectionHits || {}}
                        checkouts={gameStats?.checkouts || {}}
                        scoreRanges={gameStats?.scoreRanges || {}}
                        players={players}
                    />
                </div>
            </div>

            <div className="row mt-4">
                <div className="col d-flex justify-content-center align-items-center gap-2">
                    <SplitButton
                        label="PLAY AGAIN"
                        icon={<MdReplay className="me-2 fs-5" />}
                        onClick={onRestartGame}
                        size="small"
                        severity="primary"
                        model={[
                            { label: 'Switch Players', icon: <PiUserSwitch className="me-2 mb-1 fs-5" />, visible: game.players.length === 2, command: () => onRestartGame(true) },
                            { label: 'Shuffle Players', icon: <PiShuffle className="me-2 mb-1 fs-5" />, visible: game.players.length > 2, command: () => onRestartGame(false, true) }
                        ]}
                    />
                    <Button
                        label="NEW GAME"
                        icon="pi pi-plus"
                        onClick={onNewGame}
                        size="small"
                        outlined
                        severity="primary"
                    />
                    <Button
                        label="BACK HOME"
                        icon="pi pi-home"
                        onClick={onFinishGame}
                        size="small"
                        outlined
                        severity="primary"
                    />
                </div>
            </div>
        </div>
    );
};

export default X01GameStats;
