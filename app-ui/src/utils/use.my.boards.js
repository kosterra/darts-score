import { useEffect, useState } from 'react';

import BoardService from '../services/board.service';

// while a board is assigned it is asked about often (the game starts, ends); else as often as the bell
const ASSIGNED_MS = 15 * 1000;
const IDLE_MS = 60 * 1000;

/**
 * The user's matches called to a board or played on one now, across their
 * clubs (GET /api/boards/mine), kept up to date. → [] until known
 */
const useMyBoards = () => {
    const [mine, setMine] = useState([]);
    useEffect(() => {
        let alive = true;
        let timer = null;
        const load = async () => {
            let next = null;
            try {
                next = await BoardService.loadMine();
                if (alive) setMine(next ?? []);
            } catch {
                // the next try comes with the timer
            }
            if (alive) timer = setTimeout(load, next?.length ? ASSIGNED_MS : IDLE_MS);
        };
        load();
        return () => { alive = false; clearTimeout(timer); };
    }, []);
    return mine;
};

export default useMyBoards;
