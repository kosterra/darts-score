import OneEightyFigures from './one.eighty.figures';
import useFleeting from './use.fleeting';

// the number plays for 2.6s; the figures at the bottom need a little longer to sink back
const DURATION_MS = 3500;
const SPARKS = 24;

// sparks fly out evenly around the number, some further than others
const sparks = Array.from({ length: SPARKS }, (_, index) => ({
    angle: (360 / SPARKS) * index + (index % 2 ? 6 : -4),
    distance: 9 + (index % 3) * 3.5,
    delay: (index % 4) * 0.03,
}));

/**
 * A short burst over the game when a player scores 180, with little figures
 * holding up 180 signs from the bottom edge. It lies on top of
 * everything without catching a click or a key, so the next player throws on
 * right away; as soon as they click, tap or type it fades out quickly, and
 * otherwise it removes itself after a few seconds. "celebration" is
 * { key, name }; a new key restarts it for the next 180.
 */
const OneEightyCelebration = ({ celebration, onDone }) => {
    const leaving = useFleeting(celebration, onDone, DURATION_MS);

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
            <OneEightyFigures />
        </div>
    );
};

export default OneEightyCelebration;
