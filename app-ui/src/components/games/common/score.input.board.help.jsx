import { useState } from 'react';
import { Button } from 'primereact/button';
import { t } from '../../../utils/i18n';

/**
 * How to enter darts: a small help button, the help opening in place (in the
 * panel of the visit) instead of a popup. → [button, panel]
 * plainSingles: a plain number is a single and 50 the bullseye (X01)
 */
const useEnteringHelp = (plainSingles = false) => {
    const [open, setOpen] = useState(false);
    const button = (
        <Button type="button" icon="pi pi-question-circle" text severity="secondary" className={`score-help-button ${open ? 'is-open' : ''}`} aria-label={t('How to enter darts')} aria-expanded={open} title={t('How to enter darts')} onClick={() => setOpen(!open)} />
    );
    const panel = open && (
        <div className="entering-help">
        {plainSingles
            ? (
                <div className="fs-8">
                    <p>{t('Tap where each dart landed on the board, or type it:')}</p>
                    <ul>
                        <li><strong>20</strong>{' '}{t('(or')}{' '}<strong>{t('S20')}</strong>{t(') for a single')}</li>
                        <li><strong>{t('D20')}</strong>{' '}{t('for a double,')}{' '}<strong>{t('T20')}</strong>{' '}{t('for a treble')}</li>
                        <li><strong>25</strong>{' '}{t('for the outer bull,')}{' '}<strong>50</strong>{' '}{t('(or')}{' '}<strong>{t('D25')}</strong>{t(') for the bullseye')}</li>
                        <li><strong>0</strong>{' '}{t('for a miss')}</li>
                    </ul>
                    <p className="mb-0">{t('Then press')}{' '}<strong>{t('Enter')}</strong>{' '}{t('or')}{' '}<strong>{t('Enter score')}</strong>. <strong>{t('Undo last visit')}</strong>{' '}{t('reopens the visit before, to correct it.')}</p>
                </div>
            )
            : (
        <div className="fs-8">
            <p>{t('If you missed, simply enter')}{' '}<strong>0</strong>.</p>
            <p>{t('For any other scores, add:')}</p>
            <ul>
                <li><strong>{t('S')}</strong>{' '}{t('for a single')}</li>
                <li><strong>{t('D')}</strong>{' '}{t('for a double')}</li>
                <li><strong>{t('T')}</strong>{' '}{t('for a treble')}</li>
            </ul>
            <p>{t('So "D10" scores 20 points, "T20" scores 60 ...')}</p>
            <p className="fs-7 mt-4"><strong>{t('Note that:')}</strong></p>
            <p>
                {t('The inner BULLSEYE (50 points) =')}{' '}<strong>{t('D25')}</strong><br />
                {t('The outer BULLSEYE (25 points) =')}{' '}<strong>{t('S25')}</strong>.
            </p>
        </div>
            )
        }
            <button type="button" className="entering-help-close" onClick={() => setOpen(false)}>{t('Got it!')}</button>
        </div>
    );
    return [button, panel];
};

export default useEnteringHelp;
