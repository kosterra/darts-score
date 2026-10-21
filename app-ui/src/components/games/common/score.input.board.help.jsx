import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { t } from '../../../utils/i18n';

/**
 * How to enter darts, behind a small help button.
 * label: the line next to the button
 * plainSingles: a plain number is a single and 50 the bullseye (X01)
 * compact: just the line and the button, for a header
 */
const ScoreInputBoardHelp = ({ label = t('Tap the board or type'), plainSingles = false, compact = false }) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState('center');

    const footerContent = (
        <div>
            <Button
                label={t('Got it!')}
                icon="pi pi-check"
                onClick={() => setVisible(false)}
                autoFocus
            />
        </div>
    );

    const showHelp = (pos = 'center') => {
        setPosition(pos);
        setVisible(true);
    };

    return (
        <div>
            {/* Trigger */}
            {compact
                ? (
                    <span className="d-inline-flex align-items-center gap-2">
                        {label && <span className="text-faint fs-8">{label}</span>}
                        <Button type="button" icon="pi pi-question-circle" text rounded severity="secondary" className="score-help-button" aria-label={t('How to enter darts')} title={t('How to enter darts')} onClick={() => showHelp('bottom-right')} />
                    </span>
                )
                : (
                    <div className="mb-2 ms-1 d-flex align-items-center">
                        <span className="col-10 text-default fs-8 fw-semibold d-inline-block text-truncate">
                            {label}
                        </span>
                        <div className="col-2 d-flex justify-content-end">
                            <Button type="button" icon="pi pi-question-circle" text rounded severity="secondary" className="score-help-button me-1" aria-label={t('How to enter darts')} title={t('How to enter darts')} onClick={() => showHelp('bottom-right')} />
                        </div>
                    </div>
                )
            }

            {/* Dialog */}
            <Dialog
                header={t('Help')}
                visible={visible}
                position={position}
                style={{ width: '40vw' }}
                breakpoints={{ '960px': '50vw', '641px': '100vw' }}
                onHide={() => setVisible(false)}
                footer={footerContent}
                draggable={false}
                resizable={false}
            >
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
            </Dialog>
        </div>
    );
}

export default ScoreInputBoardHelp;
