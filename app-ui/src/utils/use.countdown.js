import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A 3-2-1 countdown that calls onDone when it reaches zero.
 * count: the number shown, null while no countdown runs
 */
const useCountdown = (onDone, from = 3) => {
    const [count, setCount] = useState(null);
    const done = useRef(onDone);
    done.current = onDone;

    useEffect(() => {
        if (count === null) return undefined;
        const timer = setTimeout(() => {
            if (count > 1) setCount(count - 1);
            else {
                setCount(null);
                done.current();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [count]);

    const begin = useCallback(() => setCount(from), [from]);
    const cancel = useCallback(() => setCount(null), []);

    return { count, begin, cancel };
};

export default useCountdown;
