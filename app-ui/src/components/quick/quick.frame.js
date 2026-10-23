import { createContext, useContext } from 'react';

// true inside a quick game being played: the game's own header then leads back to the start page
export const QuickPlaying = createContext(false);
export const useQuickPlaying = () => useContext(QuickPlaying);
