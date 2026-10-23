import { useState } from 'react';
import { Button } from 'primereact/button';
import { t } from '../../utils/i18n';

/**
 * The rules of the Around the Clock training: a link, the rules opening in
 * place below the mode instead of a popup. → [button, panel]
 */
const useATCHelp = () => {
    const [open, setOpen] = useState(false);
    const button = (
        <Button
            type="button"
            label={t('Rules')}
            link
            size="small"
            className="p-0 ms-2 fs-8 align-baseline"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={t('Show the training rules')}
        />
    );
    const panel = open && (
        <div className="entering-help text-start align-self-stretch">
            <p>{t('Hit every number from 1 to 20 in order, then the bull.')}</p>
            <ul>
                <li><strong>{t('Against the clock:')}</strong>{' '}{t('start the stopwatch with your first dart and stop it with your last hit. The fastest time wins.')}</li>
                <li><strong>{t('Fewest darts:')}</strong>{' '}{t('tap Hit or Miss for every dart (or H and M on a keyboard) until you hit the bull; 21 is perfect. To play against others, start an Around the Clock game under “Let\'s play darts”.')}</li>
            </ul>
            <p className="fw-semibold mb-2">{t('Modes')}</p>
            <ul className="mb-0">
                <li><strong>{t('Single:')}</strong>{' '}{t('only singles count, doubles and trebles do not. Finish on the outer bull.')}</li>
                <li><strong>{t('Double:')}</strong>{' '}{t('only doubles count. Finish on the bullseye.')}</li>
                <li><strong>{t('Triple:')}</strong>{' '}{t('only trebles count. There is no treble bull: finish on the bullseye.')}</li>
                <li><strong>{t('All:')}</strong>{' '}{t('any ring counts. Finish on either bull.')}</li>
            </ul>
            <button type="button" className="entering-help-close" onClick={() => setOpen(false)}>{t('Got it')}</button>
        </div>
    );
    return [button, panel];
};

export default useATCHelp;
