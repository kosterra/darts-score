import { replayElimination } from './elimination.game.summary';
import { checkoutRoutes } from './checkout.routes';

/**
 * What the scene of a visit that sends players back to 0 shows:
 * { kind, by, byIndex, victims: [{ name, index, score, left }] }.
 * The kinds, the biggest first: 'strike' (two or more sent back at once),
 * 'close' (the one sent back was on a finish), 'revenge' (the one sent back
 * had sent this player back before), otherwise 'kick'.
 */
export const knockOutScene = ({ game, players, playerId, eliminations, scoresBefore }) => {
    const nicknameOf = (id) => players?.find(player => player.id === id)?.nickname ?? '';
    const victims = eliminations.map(id => ({
        name: nicknameOf(id),
        index: game.players.indexOf(id),
        score: scoresBefore[id],
        left: game.targetScore - scoresBefore[id],
    }));
    const scene = { by: nicknameOf(playerId), byIndex: game.players.indexOf(playerId), victims };
    if (victims.length > 1) return { ...scene, kind: 'strike' };

    const [victim] = victims;
    const onAFinish = victim.left > 0 && checkoutRoutes(victim.left, { dartsLeft: 3, outMode: game.gameOutMode }).length > 0;
    if (onAFinish) return { ...scene, kind: 'close' };

    const [victimId] = eliminations;
    const earlier = replayElimination(game).eliminations;
    if (earlier.some(event => event.by === victimId && event.victim === playerId)) return { ...scene, kind: 'revenge' };

    return { ...scene, kind: 'kick' };
};
