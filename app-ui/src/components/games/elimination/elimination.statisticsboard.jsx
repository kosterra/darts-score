import { useContext, useMemo } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import EliminationContext from '../../../utils/elimination.context';

const EliminationStatisticsBoard = ({ playerId }) => {
    const { game, players, getPointsToNextPlayer } = useContext(EliminationContext);

    const player = players.find(p => p.id === playerId);
    const model = game.playerModels?.[playerId];

    const totalScore = useMemo(() => model?.score ?? 0, [model?.score]);
    const totalDarts = useMemo(() => model?.totalThrow?.darts ?? 0, [model?.totalThrow]);
    const totalRounds = useMemo(() => model?.totalThrow?.rounds ?? 0, [model?.totalThrow]);
    const avgPerDart = useMemo(
        () => totalDarts > 0 ? (totalScore / totalDarts).toFixed(2) : '0.00',
        [totalScore, totalDarts]
    );
    const avgPerRound = useMemo(
        () => totalRounds > 0 ? (totalScore / totalRounds).toFixed(2) : '0.00',
        [totalScore, totalRounds]
    );
    const bestThreeDarts = useMemo(() => model?.bestThreeDarts ?? 0, [model?.bestThreeDarts]);
    const pointsToNext = useMemo(() => getPointsToNextPlayer(playerId), [game.currentThrow, game.playerModels, playerId]);

    if (!players.length || !model) return null;

    return (
        <div className="container-fluid">
            <div className="row justify-content-md-center mb-3">
                <div className="d-flex justify-content-center align-items-center">
                    <span className="text-default fs-6 fw-semibold text-center pb-2">
                        {player?.nickname}
                    </span>
                </div>
            </div>

            <Accordion multiple>
                <AccordionTab header="Game Overview">
                    <div className="d-flex flex-column gap-2">
                        <div>Total Score: <strong>{totalScore}</strong></div>
                        <div>Darts Thrown: <strong>{totalDarts}</strong></div>
                        <div>Rounds: <strong>{totalRounds}</strong></div>
                        <div>Avg per Dart: <strong>{avgPerDart}</strong></div>
                        <div>Avg per Round: <strong>{avgPerRound}</strong></div>
                        <div>Best 3 Darts: <strong>{bestThreeDarts}</strong></div>
                        <div>
                            Points to Beat Next Player:{' '}
                            <strong>{pointsToNext === '-' || pointsToNext === 0 ? '-' : pointsToNext}</strong>
                        </div>
                    </div>
                </AccordionTab>

                <AccordionTab header="Score Ranges">
                    <div>
                        {model.scoreRanges && Object.keys(model.scoreRanges).length > 0 ? (
                            Object.entries(model.scoreRanges)
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([range, count]) => (
                                    <div key={range} className="d-flex justify-content-between">
                                        <span>{range}</span>
                                        <span><strong>{count}</strong></span>
                                    </div>
                                ))
                        ) : (
                            <span className="text-faint">No data yet</span>
                        )}
                    </div>
                </AccordionTab>
            </Accordion>
        </div>
    );
};

export default EliminationStatisticsBoard;
