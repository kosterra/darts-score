import { useCallback, useEffect, useState } from 'react';
import { getActiveClubId } from './service.utils';
import { newRound, throwDart } from './atc.darts';

// a round of Around the Clock with the fewest darts, kept in this browser so a
// reload does not lose it: { round, players, mode, session, past, saved }
// saved: playerId -> the training saved for them once the round is over
const keyOf = () => `oche.atcRound.${getActiveClubId() || 'none'}`;
// how many darts can be taken back
const UNDO_LIMIT = 300;

const load = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(keyOf()));
        return saved?.round && Array.isArray(saved.players) ? saved : null;
    } catch {
        return null;
    }
};

const store = (state) => {
    try {
        if (state) localStorage.setItem(keyOf(), JSON.stringify(state));
        else localStorage.removeItem(keyOf());
    } catch {
        // storage unavailable (private mode): the round only lives on this page
    }
};

const sessionId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const useAtcRound = () => {
    const [state, setState] = useState(load);

    useEffect(() => store(state), [state]);

    const start = useCallback((players, mode) => setState({
        round: newRound(players.map(player => player.id)),
        players,
        mode,
        session: sessionId(),
        past: [],
        saved: {},
    }), []);

    const dart = useCallback((hit) => setState(current => current && !current.round.done
        ? { ...current, past: [...current.past, current.round].slice(-UNDO_LIMIT), round: throwDart(current.round, hit) }
        : current), []);

    const undo = useCallback(() => setState(current => current?.past.length
        ? { ...current, round: current.past.at(-1), past: current.past.slice(0, -1) }
        : current), []);

    // e.g. to note what was saved, so a reload does not save it twice
    const update = useCallback((change) => setState(current => current && { ...current, ...change(current) }), []);

    const end = useCallback(() => setState(null), []);

    return { active: state, start, dart, undo, update, end };
};

export default useAtcRound;
