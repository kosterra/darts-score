import { useState } from 'react';

/**
 * Series that can be switched off and on by clicking their name in the
 * legend; a switched-off name stays in the legend, dimmed.
 */
const useHiddenSeries = () => {
    const [hidden, setHidden] = useState(() => new Set());
    const toggle = ({ dataKey }) => setHidden(current => {
        const next = new Set(current);
        if (next.has(dataKey)) next.delete(dataKey);
        else next.add(dataKey);
        return next;
    });
    const legendLabel = (name, { dataKey }) => <span style={{ opacity: hidden.has(dataKey) ? 0.4 : 1, cursor: 'pointer' }}>{name}</span>;
    return { isHidden: (key) => hidden.has(key), toggle, legendLabel };
};

export default useHiddenSeries;
