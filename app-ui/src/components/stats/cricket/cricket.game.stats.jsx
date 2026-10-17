import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import { PiShuffle, PiUserSwitch } from 'react-icons/pi';
import { MdReplay } from 'react-icons/md';

import PlayerService from '../../../services/player.service';
import CricketService from '../../../services/cricket.service';
import PageLoader from '../../elements/page.loader';
import GameBadges from '../../badges/game.badges';
import GameResultHeader from '../common/game.result.header';
import MatchMoments from '../common/match.moments';
import { whenPlayed } from '../common/game.text';
import HitsHeatmapChart from '../charts/hits.heatmap.chart';
import CricketBoardPanel, { CricketProgressChart } from './cricket.board.panel';
import { CRICKET_NUMBERS, replayCricket, cricketFigures, cricketProgress, cricketMoments, hitsBySection } from '../../../utils/cricket.game.summary';
import { cricketRematch } from '../../../utils/cricket.rematch';

// the key figures of every player in the header
const FIGURES = [
    { key: 'marksPerRound', label: 'Marks per round', format: (value) => value.toFixed(2) },
    { key: 'points', label: 'Points' },
    { key: 'bestRound', label: 'Best round', format: (value) => `${value} marks` },
    { key: 'bestPoints', label: 'Most points in a round' },
    { key: 'triples', label: 'Triples' },
    { key: 'bulls', label: 'Bull marks' },
    { key: 'closedFirst', label: 'Numbers closed first', format: (value) => `${value} of 7` },
    { key: 'dartsThrown', label: 'Darts thrown', neutral: true },
];

/**
 * The statistics of one Cricket game: the result with each player's key
 * figures, the moments of the game, the board at the end with the race to
 * close all numbers, the points over the game and where the darts landed.
 */
const CricketGameStats = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [players, setPlayers] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const gameData = await CricketService.loadCricketGameById(id);
                if (!gameData) return setFailed(true);
                const playerData = (await PlayerService.findPlayersByIds(gameData.players))
                    .filter(player => gameData.players.includes(player.id))
                    .sort((a, b) => gameData.players.indexOf(a.id) - gameData.players.indexOf(b.id));
                setGame(gameData);
                setPlayers(playerData);
            } catch (err) {
                console.error('Failed to load game data', err);
                setFailed(true);
            }
        };
        loadData();
    }, [id]);

    const replay = useMemo(() => game ? replayCricket(game) : null, [game]);
    const figures = useMemo(() => game && players && replay
        ? Object.fromEntries(players.map(player => [player.id, cricketFigures(game, player.id, replay)]))
        : {}, [game, players, replay]);
    const progress = useMemo(() => game && replay ? cricketProgress(game, replay) : { closing: [], points: [] }, [game, replay]);
    const moments = useMemo(() => game && replay ? cricketMoments(game, replay) : [], [game, replay]);

    if (failed) return <div className="container-fluid p-4 text-subtle">This game could not be found in the selected club.</div>;
    if (!game || !players) return <PageLoader />;

    const onRestartGame = async (switchPlayers = false, shuffle = false) => {
        const newGame = await CricketService.createCricketGame(cricketRematch(game, { switchPlayers, shuffle }));
        navigate(`/cricket/${newGame.id}`);
    };

    const actions = (
        <>
            <SplitButton
                label="Play again"
                icon={<MdReplay className="me-2 fs-5" />}
                onClick={() => onRestartGame()}
                size="small"
                severity="primary"
                menuClassName="p-splitbutton-menu-primary"
                model={[
                    { label: 'Switch players', icon: <PiUserSwitch className="me-2 mb-1 fs-5" />, visible: game.players.length === 2, command: () => onRestartGame(true) },
                    { label: 'Shuffle players', icon: <PiShuffle className="me-2 mb-1 fs-5" />, visible: game.players.length > 2, command: () => onRestartGame(false, true) }
                ]}
            />
            <Button label="New game" icon="pi pi-plus" onClick={() => navigate('/cricket', { replace: true })} size="small" outlined severity="primary" />
            <Button label="Home" icon="pi pi-home" onClick={() => navigate('/', { replace: true })} size="small" outlined />
        </>
    );

    return (
        <div className="container-fluid p-4 border-0">
            <div className="game-stats-page">
                <GameResultHeader
                    game={game}
                    players={players}
                    title="Cricket · 15 to 20 and the bull"
                    subtitle={whenPlayed(game)}
                    scoreOf={(player) => figures[player.id]?.points ?? 0}
                    // the points are the score; under them how much of the board the player closed
                    scoreDetailOf={(player) => `${CRICKET_NUMBERS.filter(n => replay.board[n].marks[player.id] >= 3).length} of 7 numbers closed`}
                    rows={FIGURES}
                    figures={figures}
                    actions={actions}
                />

                <GameBadges
                    gameType="cricket"
                    gameId={game.id}
                    players={players}
                    winner={players.find(player => game.playerModels[player.id]?.hasWonGame)}
                    className="mb-4"
                />

                <MatchMoments moments={moments} players={players} />

                <CricketBoardPanel board={replay.board} players={players} closing={progress.closing} />

                <div className="row g-4">
                    <div className="col-12 col-xl-6">
                        <CricketProgressChart
                            title="Points over the game"
                            description="Each player's points after every round: they come from marks on numbers the others have not closed yet."
                            data={progress.points}
                            players={players}
                            unit="points"
                        />
                    </div>
                    <div className="col-12 col-xl-6">
                        <HitsHeatmapChart hitsByPlayer={players.map(player => hitsBySection(game.playerModels[player.id]?.hit))} players={players} gameName="this game" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CricketGameStats;
