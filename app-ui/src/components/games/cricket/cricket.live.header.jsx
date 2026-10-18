import { useContext, useEffect, useRef, useState } from 'react';

import CricketContext from '../../../utils/cricket.context';
import LiveHero from '../common/live.hero';
import { CRICKET_NUMBERS, replayCricket } from '../../../utils/cricket.game.summary';
import { variantOf } from '../../../utils/cricket.variants';
import { cricketTip, liveMarks, visitMarks } from './cricket.live';

const RULES = {
    Standard: 'Close 15 to 20 and the bull · marks beyond the third score · most points wins',
    'Cut-throat': 'Extra marks score for the others · lowest score wins',
    'No-score': 'Only closing counts',
};

/**
 * The top of a running Cricket game: every player with their points (live
 * while the darts are entered), what to aim at next and how much of the board
 * they closed.
 */
const CricketLiveHeader = () => {
    const { game, players, getCurrentThrowScore, getCurrentSectionHit } = useContext(CricketContext);
    const variant = variantOf(game);
    const ordered = game.players.map(id => players.find(player => player.id === id)).filter(Boolean);
    const marks = liveMarks(game, getCurrentSectionHit());
    const scores = Object.fromEntries(game.players.map(id => [id, id === game.currentPlayerTurn ? getCurrentThrowScore() : game.playerModels[id]?.score ?? 0]));
    const { visits } = replayCricket(game);
    const round = visits.filter(visit => visit.playerId === game.currentPlayerTurn).length + 1;

    // who leads on points right now (the lowest score in cut-throat), nobody when level;
    // a player who takes the lead sees their score flash gold
    const values = game.players.map(id => scores[id]);
    const best = variant === 'Cut-throat' ? Math.min(...values) : Math.max(...values);
    const leaders = game.players.filter(id => scores[id] === best);
    const leader = variant !== 'No-score' && leaders.length === 1 && values.some(value => value !== best) ? leaders[0] : null;
    const previousLeader = useRef(undefined);
    const [flash, setFlash] = useState(null);
    useEffect(() => {
        if (previousLeader.current !== undefined && leader && leader !== previousLeader.current) setFlash({ id: leader, key: Date.now() });
        previousLeader.current = leader;
    }, [leader]);

    const rows = ordered.map(player => {
        const mine = visits.filter(visit => visit.playerId === player.id);
        const last = mine.at(-1);
        const allMarks = mine.reduce((sum, visit) => sum + visit.marks, 0);
        const tip = cricketTip(game, marks, scores, player.id);
        const closed = CRICKET_NUMBERS.filter(n => marks[player.id][n] >= 3).length;
        return {
            player,
            isTurn: game.currentPlayerTurn === player.id,
            line: <>Last visit <strong>{last ? `${visitMarks(last.darts)} marks` : '–'}</strong> · <strong>{mine.length ? (allMarks / mine.length).toFixed(1) : '–'}</strong> per round</>,
            score: variant === 'No-score' ? `${closed}/7` : scores[player.id],
            scoreClass: flash?.id === player.id ? 'is-taking-lead' : '',
            scoreKey: flash?.id === player.id ? flash.key : 'score',
            below: (
                <>
                    <span className="x01-live-route" title={tip?.title}>{tip?.text ?? 'All closed'}</span>
                    <span className="x01-live-won">
                        <span className="x01-won">
                            <span className="x01-won-label">Closed</span>
                            <span className="x01-won-number">{closed} / 7</span>
                        </span>
                    </span>
                </>
            ),
        };
    });

    return (
        <LiveHero
            title={`Cricket${variant === 'Standard' ? '' : ` · ${variant}`}`}
            subtitle={`${RULES[variant] ?? RULES.Standard} · Round ${round}`}
            rows={rows}
        />
    );
};

export default CricketLiveHeader;
