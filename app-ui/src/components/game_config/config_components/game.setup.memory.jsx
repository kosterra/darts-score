import { Button } from 'primereact/button';
import { t } from '../../../utils/i18n';

/**
 * Says that the page is set up like the last game (or training), with a way
 * to start fresh.
 */
const GameSetupMemory = ({ onReset, what = 'game' }) => (
    <div className="game-setup-memory">
        <span><i className="pi pi-history me-1" aria-hidden="true" />{t('Set up like your last')}{' '}{what}</span>
        <Button type="button" label={t('Start fresh')} size="small" text onClick={onReset} />
    </div>
);

export default GameSetupMemory;
