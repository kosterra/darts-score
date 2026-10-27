import { useEffect, useState } from 'react';

// whether a media query matches, following the window: useMediaQuery('(max-width: 575.98px)')
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
    useEffect(() => {
        const list = window.matchMedia?.(query);
        if (!list) return undefined;
        const update = () => setMatches(list.matches);
        update();
        list.addEventListener('change', update);
        return () => list.removeEventListener('change', update);
    }, [query]);
    return matches;
};

export default useMediaQuery;
