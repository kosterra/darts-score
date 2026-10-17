import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY = 250;
const GAP = 8;

// an SVG shape names itself with a <title> child, e.g. the level badges on a chart
const svgTitleOf = (element) => {
    const shape = element.closest?.('svg g, svg path, svg circle, svg rect');
    if (!shape) return null;
    for (let node = shape; node && node.tagName !== 'svg'; node = node.parentElement) {
        const title = [...node.children].find(child => child.tagName === 'title');
        if (title?.textContent) return { element: node, text: title.textContent };
    }
    return null;
};

/**
 * The tooltip of the whole app: every element with a "title" (and every SVG
 * shape with a <title>) shows its text in the same card as the charts instead
 * of the browser's own box, on hovering and on keyboard focus. Listening once
 * on the page, it also covers elements added later. The text stays readable
 * for screen readers: it becomes the element's label when it has no other.
 */
const AppTooltip = () => {
    const [tip, setTip] = useState(null);
    const [shift, setShift] = useState(0);
    const timer = useRef(null);
    const current = useRef(null);
    const card = useRef(null);

    // a card that would leave the window is moved back inside it
    useLayoutEffect(() => {
        if (!tip || !card.current) return;
        const box = card.current.getBoundingClientRect();
        const margin = 8;
        const over = box.right - (window.innerWidth - margin);
        const under = margin - box.left;
        setShift(over > 0 ? -over : under > 0 ? under : 0);
    }, [tip]);

    useEffect(() => {
        // scrolling elsewhere on the page (some parts do on their own) keeps the tooltip;
        // it only goes when the element under it moves away
        const anchor = { top: null, left: null };

        const hide = () => {
            clearTimeout(timer.current);
            current.current = null;
            anchor.top = null;
            setTip(null);
        };

        const targetOf = (node) => {
            if (!(node instanceof Element)) return null;
            const titled = node.closest('[title], [data-app-tip]');
            if (titled && !titled.closest('svg')) {
                // the browser's box would show as well: the text moves to data-app-tip
                const title = titled.getAttribute('title');
                if (title) {
                    titled.setAttribute('data-app-tip', title);
                    titled.removeAttribute('title');
                    if (!titled.getAttribute('aria-label') && !titled.textContent.trim()) titled.setAttribute('aria-label', title);
                }
                const text = titled.getAttribute('data-app-tip');
                return text ? { element: titled, text } : null;
            }
            return svgTitleOf(node);
        };

        const show = (event) => {
            const target = targetOf(event.target);
            if (!target) return;
            if (current.current === target.element) return;
            current.current = target.element;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                const box = target.element.getBoundingClientRect();
                if (!box.width && !box.height) return;
                anchor.top = box.top;
                anchor.left = box.left;
                // above the element, below when there is no room; inside the window
                const above = box.top > 48;
                setShift(0);
                setTip({
                    text: target.text,
                    x: Math.min(Math.max(box.left + box.width / 2, 16), window.innerWidth - 16),
                    y: above ? box.top - GAP : box.bottom + GAP,
                    above,
                });
            }, event.type === 'focusin' ? 0 : SHOW_DELAY);
        };

        const onScroll = () => {
            const element = current.current;
            if (!element) return;
            const box = element.getBoundingClientRect();
            if (anchor.top != null && (Math.abs(box.top - anchor.top) > 2 || Math.abs(box.left - anchor.left) > 2)) hide();
        };

        const leave = (event) => {
            const element = current.current;
            if (element && event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
            hide();
        };

        document.addEventListener('mouseover', show);
        document.addEventListener('focusin', show);
        document.addEventListener('mouseout', leave);
        document.addEventListener('focusout', hide);
        document.addEventListener('mousedown', hide);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            clearTimeout(timer.current);
            document.removeEventListener('mouseover', show);
            document.removeEventListener('focusin', show);
            document.removeEventListener('mouseout', leave);
            document.removeEventListener('focusout', hide);
            document.removeEventListener('mousedown', hide);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    if (!tip) return null;
    return createPortal(
        <div ref={card} className={`chart-tooltip app-tooltip ${tip.above ? 'is-above' : 'is-below'}`} style={{ left: tip.x + shift, top: tip.y }} role="tooltip">
            {tip.text}
        </div>,
        document.body
    );
};

export default AppTooltip;
