import { useOffline } from '../../../utils/unsent.games';
import { t } from '../../../utils/i18n';

/**
 * Under a running game while a visit is not on the server yet: scoring goes
 * on, the game is kept on this device and sent once there is a connection.
 * finished: the game is over and waits for it before its result opens.
 */
const SaveStatus = ({ unsent, finished = false }) => {
    const offline = useOffline();
    if (!unsent) return null;
    return (
        <div className={`save-status ${finished ? 'is-finished' : ''}`} role="status">
            <i className={`pi ${offline ? 'pi-wifi' : 'pi-sync pi-spin'}`} aria-hidden="true" />
            <span>
                <strong>{offline ? t('No connection') : t('Not sent yet')}</strong>{' · '}
                {finished
                    ? t('The game is over and kept on this device. It is sent as soon as there is a connection, then its result opens.')
                    : t('Score on: the game is kept on this device and sent as soon as there is a connection.')}
            </span>
        </div>
    );
};

export default SaveStatus;
