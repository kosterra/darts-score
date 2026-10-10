import { createContext } from 'react';

const CricketContext = createContext({
    game: null,
    players: [],
    currentThrow: [],
    setGame: () => { },
    setPlayers: () => { },
});

export default CricketContext;
