import { useEffect, useRef } from 'react';

const COLORS = ['#528b6e', '#7ecca5', '#ed4b2c', '#ffc94d', '#efe6d0', '#d4c783'];
const PIECES = 160;
const DURATION_MS = 4500;

/**
 * A burst of confetti over its parent, drawn on a canvas. Renders nothing for
 * people who asked their system to reduce motion.
 */
const Confetti = ({ className = 'celebration-confetti' }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const context = canvas.getContext('2d');
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const random = (min, max) => min + Math.random() * (max - min);
        // two cannons at the bottom corners, firing up and inwards
        const pieces = Array.from({ length: PIECES }, (_, index) => {
            const fromLeft = index % 2 === 0;
            return {
                x: fromLeft ? 0 : canvas.width,
                y: canvas.height * 0.85,
                vx: (fromLeft ? 1 : -1) * random(2, 13),
                vy: random(-19, -8),
                size: random(6, 12),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rotation: random(0, Math.PI * 2),
                spin: random(-0.25, 0.25),
            };
        });

        const start = performance.now();
        let frame;
        const draw = (now) => {
            const elapsed = now - start;
            context.clearRect(0, 0, canvas.width, canvas.height);
            // fade out over the last second
            context.globalAlpha = Math.min(1, (DURATION_MS - elapsed) / 1000);
            for (const piece of pieces) {
                piece.vy += 0.32;
                piece.vx *= 0.99;
                piece.x += piece.vx;
                piece.y += piece.vy;
                piece.rotation += piece.spin;
                context.save();
                context.translate(piece.x, piece.y);
                context.rotate(piece.rotation);
                context.fillStyle = piece.color;
                context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
                context.restore();
            }
            if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw);
            else context.clearRect(0, 0, canvas.width, canvas.height);
        };
        frame = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

export default Confetti;
