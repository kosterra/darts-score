import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The players a link chose for a game setup (?players=a,b, e.g. "Start a game
 * between them" from the player comparison), or null.
 */
const useLinkedPlayers = () => {
    const [params] = useSearchParams();
    const value = params.get('players');
    return useMemo(() => (value ? value.split(',').filter(Boolean) : null), [value]);
};

export default useLinkedPlayers;
