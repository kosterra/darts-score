import { Button } from 'primereact/button';
import { t } from '../../../utils/i18n';

/**
 * Says that the page is set up like the last game (or training), with a way
 * to start fresh. training: the last training instead.
 */
const GameSetupMemory = ({ onReset, training = false }) => (
    <div className="game-setup-memory">
        <span><i className="pi pi-history me-1" aria-hidden="true" />{training ? t('Set up like your last training') : t('Set up like your last game')}</span>
        <Button type="button" label={t('Start fresh')} size="small" text onClick={onReset} />
    </div>
);

export default GameSetupMemory;
