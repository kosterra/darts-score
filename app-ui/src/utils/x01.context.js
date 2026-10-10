import { createContext } from 'react';

const X01Context = createContext({
    game: null,
    players: [],
    loading: { initGameLoading: false },
    // hier können weitere Default-Werte ergänzt werden
});

export default X01Context;
