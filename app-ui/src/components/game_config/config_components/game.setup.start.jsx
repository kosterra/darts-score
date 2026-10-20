import { Button } from 'primereact/button';

/**
 * The start button with what will be played, e.g. "501 · Double Out ·
 * Best of 3 legs · Anna vs Ben". It is enabled once the setup is complete,
 * otherwise it says what is missing.
 */
const GameSetupStart = ({ summary, missing, loading, onStart, label = 'Start game' }) => (
    <div className="game-setup-start">
        <Button
            type="button"
            label={label}
            icon="pi pi-play"
            disabled={Boolean(missing) || loading}
            loading={loading}
            onClick={onStart}
        />
        <span className="game-setup-summary" aria-live="polite">{missing || summary}</span>
    </div>
);

export default GameSetupStart;
