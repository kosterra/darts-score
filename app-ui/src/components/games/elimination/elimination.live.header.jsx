import { useContext, useEffect, useRef, useState } from 'react';

import EliminationContext from '../../../utils/elimination.context';
import LiveHero from '../common/live.hero';
import { checkoutRoutes, formatRoute } from '../../../utils/checkout.routes';
import { knockBacks, liveScores, visitsOf } from './elimination.live';

/**
 * The top of a running Elimination game: every player with their score (live
 * while the darts are entered), the way to the target or whom one dart sends
 * back, and what it takes to pass the next player.
 */
const EliminationLiveHeader = () => {
    const { game, players, getCurrentThrowScore, checkIfScoreIsBusted, getPointsToNextPlayer } = useContext(EliminationContext);
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const scores = liveScores(game, getCurrentThrowScore());
    const dartsEntered = game.currentThrow.filter(dart => dart.trim() !== '').length;
    const nickname = (id) => players.find(player => player.id === id)?.nickname ?? '';
    const round = visitsOf(game, game.currentPlayerTurn).length + 1;
    // whom the player at the oche can send back with one dart: their score glows red
    const inDanger = new Set(knockBacks(game, scores, game.currentPlayerTurn).map(entry => entry.playerId));

    // who leads (alone) right now; a player who takes the lead sees their score flash gold
    const best = Math.max(...game.players.map(id => scores[id]));
    const leaders = game.players.filter(id => scores[id] === best);
    const leader = best > 0 && leaders.length === 1 ? leaders[0] : null;
    const previousLeader = useRef(undefined);
    const [flash, setFlash] = useState(null);
    useEffect(() => {
        if (previousLeader.current !== undefined && leader && leader !== previousLeader.current) setFlash({ id: leader, key: Date.now() });
        previousLeader.current = leader;
    }, [leader]);

    const rows = ordered.map(player => {
        const isTurn = game.currentPlayerTurn === player.id;
        const score = scores[player.id];
        const busted = isTurn && checkIfScoreIsBusted(score);
        const visits = visitsOf(game, player.id);
        const last = visits.at(-1);
        const darts = game.playerModels[player.id]?.totalThrow?.darts ?? 0;
        const dartsLeft = isTurn ? (3 - dartsEntered) || 3 : 3;
        const route = busted ? null : checkoutRoutes(game.targetScore - score, { dartsLeft, outMode: game.gameOutMode })[0];
        const knock = busted || route ? null : knockBacks(game, scores, player.id)[0];
        const toPass = getPointsToNextPlayer(player.id);
        return {
            player,
            isTurn,
            line: <>Last visit <strong>{last ? (last.bust ? 'Bust' : last.roundScore) : '–'}</strong> · <strong>{darts}</strong> darts</>,
            score: busted ? 'BUST' : score,
            scoreClass: [busted ? 'is-bust' : '', inDanger.has(player.id) ? 'is-in-danger' : '', flash?.id === player.id ? 'is-taking-lead' : ''].filter(Boolean).join(' '),
            scoreKey: flash?.id === player.id ? flash.key : 'score',
            tags: inDanger.has(player.id) ? <span className="elimination-danger-tag">In reach</span> : null,
            below: (
                <>
                    <span
                        className={`x01-live-route ${route ? '' : 'is-setup'}`}
                        title={knock ? `Lands on ${nickname(knock.playerId)}'s score: back to 0` : undefined}
                    >
                        {route ? formatRoute(route)
                            : knock ? <>{knock.dart}<span className="x01-route-leaves"><i className="pi pi-arrow-right" aria-hidden="true" />{nickname(knock.playerId)} back to 0</span></>
                            : `${game.targetScore - score} to go`}
                    </span>
                    <span className="x01-live-won">
                        <span className="x01-won">
                            <span className="x01-won-label">To pass</span>
                            <span className="x01-won-number">{toPass === '-' || !toPass ? 'Leads' : toPass}</span>
                        </span>
                    </span>
                </>
            ),
        };
    });

    const modes = [game.gameInMode && game.gameInMode !== 'Straight In' ? game.gameInMode : null, game.gameOutMode].filter(Boolean).join(' / ');

    return (
        <LiveHero
            title={`Elimination · ${game.targetScore}`}
            subtitle={`${modes} · land on an opponent's score to send them back to 0 · Round ${round}`}
            rows={rows}
        />
    );
};

export default EliminationLiveHeader;
