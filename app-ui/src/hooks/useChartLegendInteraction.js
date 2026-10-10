import { useState } from 'react';

const useChartLegendInteraction = (keys) => {
    const [props, setProps] = useState(
        keys.reduce((acc, key) => ({ ...acc, [key]: false }), { hover: null })
    );

    const onLegendMouseEnter = (e) => {
        if (!props[e.dataKey]) setProps({ ...props, hover: e.dataKey });
    };

    const onLegendMouseLeave = () => setProps({ ...props, hover: null });

    const onLegendClick = (e) =>
        setProps({ ...props, [e.dataKey]: !props[e.dataKey], hover: null });

    return [props, onLegendMouseEnter, onLegendMouseLeave, onLegendClick];
};

export default useChartLegendInteraction;
