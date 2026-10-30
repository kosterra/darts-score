import { useEffect } from 'react';

/**
 * Lets the parts of a page marked data-reveal rise into view as the visitor
 * scrolls to them: the root gets "has-reveal" (the stylesheet hides the parts
 * until then, so nothing is hidden without this), every part "is-seen" once
 * it shows. "ready" changes when parts were added (e.g. data came in). With
 * reduced motion, or without an IntersectionObserver, nothing moves.
 */
const useReveal = (rootRef, ready) => {
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
        root.classList.add('has-reveal');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-seen');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
        root.querySelectorAll('[data-reveal]:not(.is-seen)').forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [rootRef, ready]);
};

export default useReveal;
