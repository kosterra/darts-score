import { useEffect, useRef, useState } from 'react';

import { legSummaryOf } from './x01.live';

// how long a reaction (a happy face, a sad one, surprise) shows before the bot is itself again
const REACTION_MS = 2600;

/**
 * How the bot of an X01 game feels: throwing at its turn, and for a moment
 * after something happened – happy about a visit of 100 or more or a leg it
 * won, sad about a bust or a leg lost, surprised by the player's 180 – and at
 * the end happy or sad for good. botId: the bot's id in the game, or none.
 */
const useBotMood = (game, botId) => {
    const [reaction, setReaction] = useState(null);
    const timer = useRef(null);
    const react = (mood) => {
        clearTimeout(timer.current);
        setReaction(mood);
        timer.current = setTimeout(() => setReaction(null), REACTION_MS);
    };
    useEffect(() => () => clearTimeout(timer.current), []);

    // a new visit: what it was
    const visits = game.currentLegThrows.length;
    const seenVisits = useRef(visits);
    // a leg won, by the bot or by someone else
    const legsOf = (id) => game.playerModels[id]?.legsWon?.game ?? 0;
    const botLegs = botId ? legsOf(botId) : 0;
    const allLegs = game.players.reduce((sum, id) => sum + legsOf(id), 0);
    const seenLegs = useRef({ bot: botLegs, all: allLegs });

    useEffect(() => {
        if (!botId) return;
        if (allLegs > seenLegs.current.all) react(botLegs > seenLegs.current.bot ? 'happy' : 'sad');
        else if (visits > seenVisits.current) {
            const last = game.currentLegThrows.at(-1);
            const bust = legSummaryOf(game, last.playerId).lastVisit?.bust;
            const score = Number(last.roundScore);
            if (last.playerId === botId) {
                if (bust) react('sad');
                else if (score >= 100) react('happy');
            } else if (!bust && score === 180) react('surprised');
        }
        seenVisits.current = visits;
        seenLegs.current = { bot: botLegs, all: allLegs };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visits, allLegs, botId]);

    if (!botId) return null;
    if (game.hasWinner) return game.playerModels[botId]?.hasWonGame ? 'happy' : 'sad';
    if (reaction) return reaction;
    return game.currentPlayerTurn === botId ? 'throwing' : 'idle';
};

export default useBotMood;
