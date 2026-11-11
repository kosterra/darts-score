import { Fragment, createElement } from 'react';

// a count out of a whole ("418 / 1710", "2 / 30"): both sides numbers, possibly with a % or a decimal
const OUT_OF = /^\s*([\d.,'\u2019\u2009\u00a0]+\s*%?)\s*\/\s*([\d.,'\u2019\u2009\u00a0]+\s*%?)\s*$/;

/**
 * A figure as it is shown: a count out of a whole with the whole smaller and
 * quieter after the slash ("418" big, "/ 1710" small), so the number that
 * counts stands out; anything else as it is ("Straight In / Double Out" too).
 */
const FigureValue = ({ value }) => {
    const match = typeof value === 'string' ? value.match(OUT_OF) : null;
    if (!match) return value ?? null;
    return createElement(Fragment, null, match[1].trim(), createElement('span', { className: 'figure-of' }, ` / ${match[2].trim()}`));
};

export default FigureValue;
