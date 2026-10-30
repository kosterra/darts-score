import { useLayoutEffect, useRef } from 'react';

// the grid's rows are this many pixels (see _dashboard.scss); a widget spans as many as its content
// needs, plus the room between the rows, so the widgets pack below each other like masonry
export const ROW_PX = 8;
export const GAP_PX = 24;

/**
 * The grid of a dashboard: twelve columns, and rows so small that every
 * widget takes exactly the height of its content. A short widget beside a
 * tall one leaves no empty panel; the next widgets move up into the room.
 * gridRef: the grid, for the editor to measure the widgets' places.
 */
export const DashboardGrid = ({ children, gridRef = null, className = '' }) => (
    <div className={`dashboard-grid ${className}`} ref={gridRef}>{children}</div>
);

/**
 * One widget's cell in the grid: as wide as its size says (S a third, M half,
 * L two thirds, F the full width; on a phone all the full width) and as tall
 * as its content, measured as it changes. A height chosen (S, M, L) caps the
 * widget's panel; its content scrolls inside. cellRef: the cell, for the editor.
 */
export const DashboardCell = ({ widget, children, cellRef = null, className = '' }) => {
    const content = useRef(null);
    const cell = useRef(null);
    const setRefs = (element) => {
        cell.current = element;
        if (typeof cellRef === 'function') cellRef(element);
        else if (cellRef) cellRef.current = element;
    };

    // the rows the content needs: set on the cell itself, so the grid is laid out again
    // without drawing the widget again
    useLayoutEffect(() => {
        const element = content.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const fit = () => {
            const height = element.getBoundingClientRect().height;
            if (cell.current) cell.current.style.gridRowEnd = `span ${Math.max(1, Math.ceil((height + GAP_PX) / ROW_PX))}`;
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div className={`dashboard-cell is-size-${widget.size} is-height-${widget.height ?? 'auto'} ${className}`} ref={setRefs}>
            <div className="dashboard-cell-content" ref={content}>{children}</div>
        </div>
    );
};
