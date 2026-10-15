import { useEffect, useState } from 'react';

const DURATION_MS = 2600;
const SPARKS = 24;

// sparks fly out evenly around the number, some further than others
const sparks = Array.from({ length: SPARKS }, (_, index) => ({
    angle: (360 / SPARKS) * index + (index % 2 ? 6 : -4),
    distance: 9 + (index % 3) * 3.5,
    delay: (index % 4) * 0.03,
}));

const LEAVE_MS = 250;

/**
 * A short burst over the game when a player scores 180. It lies on top of
 * everything without catching a click or a key, so the next player throws on
 * right away; as soon as they click, tap or type it fades out quickly, and
 * otherwise it removes itself after a few seconds. "celebration" is
 * { key, name }; a new key restarts it for the next 180.
 */
const OneEightyCelebration = ({ celebration, onDone }) => {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!celebration) return undefined;
        setLeaving(false);
        let leaveTimer;
        const timer = setTimeout(onDone, DURATION_MS);
        // the next player getting on with the game makes room at once
        const makeRoom = () => {
            setLeaving(true);
            clearTimeout(timer);
            leaveTimer = setTimeout(onDone, LEAVE_MS);
        };
        // the click that confirmed the 180 is already over, so listening starts now
        window.addEventListener('pointerdown', makeRoom, { once: true, capture: true });
        window.addEventListener('keydown', makeRoom, { once: true, capture: true });
        return () => {
            clearTimeout(timer);
            clearTimeout(leaveTimer);
            window.removeEventListener('pointerdown', makeRoom, { capture: true });
            window.removeEventListener('keydown', makeRoom, { capture: true });
        };
    }, [celebration, onDone]);

    if (!celebration) return null;

    return (
        <div key={celebration.key} className={`one-eighty ${leaving ? 'one-eighty-leaving' : ''}`} aria-live="polite">
            <span className="visually-hidden">One hundred and eighty by {celebration.name}!</span>
            <div className="one-eighty-flash" aria-hidden="true" />
            <div className="one-eighty-stage" aria-hidden="true">
                <span className="one-eighty-ring" />
                <span className="one-eighty-ring one-eighty-ring-late" />
                {sparks.map((spark, index) => (
                    <span
                        key={index}
                        className="one-eighty-spark"
                        style={{ '--angle': `${spark.angle}deg`, '--distance': `${spark.distance}rem`, '--delay': `${spark.delay}s` }}
                    />
                ))}
                <span className="one-eighty-number">180</span>
                <span className="one-eighty-label">
                    <span className="one-eighty-name">{celebration.name}</span>
                    <span className="one-eighty-words">One hundred and eighty!</span>
                </span>
            </div>
        </div>
    );
};

export default OneEightyCelebration;
