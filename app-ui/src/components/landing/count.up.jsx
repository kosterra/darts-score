import { useEffect, useRef, useState } from 'react';

const COUNT_MS = 1300;

/**
 * A figure that counts up from zero once it scrolls into view, and from where
 * it stands to a new value after that. format(value): the text to show. With
 * reduced motion, or without an IntersectionObserver, the value at once.
 */
const CountUp = ({ value, format = String }) => {
    const ref = useRef(null);
    const [shown, setShown] = useState(0);
    const shownRef = useRef(0);
    shownRef.current = shown;

    useEffect(() => {
        const element = ref.current;
        const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (still || !element || !('IntersectionObserver' in window)) {
            setShown(value);
            return undefined;
        }
        let frame;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const from = shownRef.current;
            const start = performance.now();
            const tick = (now) => {
                const progress = Math.min(1, (now - start) / COUNT_MS);
                const eased = 1 - (1 - progress) ** 3;
                setShown(Math.round(from + (value - from) * eased));
                if (progress < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        }, { threshold: 0.4 });
        observer.observe(element);
        return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    }, [value]);

    return <span ref={ref}>{format(shown)}</span>;
};

export default CountUp;
