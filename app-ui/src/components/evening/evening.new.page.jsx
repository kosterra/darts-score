import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import EveningService from '../../services/evening.service';
import QuickLayout from '../quick/quick.layout';
import { QUICK_NAME } from '../../utils/quick.games';
import { t } from '../../utils/i18n';

const MAX_PLAYERS = 8;

/**
 * A darts evening without an account: the names of the two to eight
 * players once, and maybe a name for the evening. Then game after game.
 */
const EveningNewPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const [name, setName] = useState('');
    const [names, setNames] = useState(['', '', '']);
    const [starting, setStarting] = useState(false);

    const filled = names.map(entry => entry.trim()).filter(Boolean);
    const invalid = filled.some(entry => !QUICK_NAME.test(entry));
    const twice = new Set(filled.map(entry => entry.toLowerCase())).size !== filled.length;
    const missing = filled.length < 2 ? t('At least two players') : invalid ? t('A name has 1 to 20 letters or digits.') : twice ? t('Every player needs a name of their own') : null;

    const setNameAt = (index, value) => setNames(current => current.map((entry, i) => (i === index ? value : entry)));
    const start = async (event) => {
        event.preventDefault();
        if (missing) return;
        setStarting(true);
        try {
            const evening = await EveningService.createEvening({ name: name.trim(), names: filled });
            navigate(`/evening/${evening.id}`);
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Start the evening'), detail: error.message, life: 5000 });
            setStarting(false);
        }
    };

    return (
        <QuickLayout suffix={t('· Darts evening')}>
            <Toast ref={toast} position="bottom-right" />
            <Panel header={t('Darts evening')} className="page-narrow">
                <form className="container" onSubmit={start}>
                    <p className="text-subtle fs-7 mt-0">
                        {t('For a group playing together tonight: the names once, then game after game of X01, Cricket or Elimination. A table of the evening follows every game, with awards at the end, and friends follow it on their phones. No account needed; kept for 30 days.')}{' '}
                        <Link to="/quick">{t('Just one game?')}</Link>
                    </p>

                    <p className="game-setup-section-title">{t('Players')}</p>
                    <div className="quick-names">
                        {names.map((entry, index) => (
                            <div key={index} className="quick-name">
                                <span className="quick-name-number" aria-hidden="true">{index + 1}</span>
                                <InputText
                                    value={entry}
                                    onChange={(event) => setNameAt(index, event.target.value)}
                                    placeholder={t('Player {{value}}', { value: index + 1 })}
                                    aria-label={t('Name of player {{value}}', { value: index + 1 })}
                                    maxLength={20}
                                    className="flex-grow-1"
                                />
                                {names.length > 2 &&
                                    <Button type="button" icon="pi pi-times" text rounded severity="secondary" aria-label={t('Remove player {{value}}', { value: index + 1 })} onClick={() => setNames(current => current.filter((_, i) => i !== index))} />}
                            </div>
                        ))}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            {names.length < MAX_PLAYERS
                                ? <Button type="button" label={t('Add a player')} icon="pi pi-plus" size="small" text onClick={() => setNames(current => [...current, ''])} />
                                : <span />}
                            <span className="text-faint fs-8">{t('Two to eight players; each game is played by two to four of them.')}</span>
                        </div>
                    </div>

                    <p className="game-setup-section-title mt-4">{t('Name of the evening')}</p>
                    <InputText value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder={t('Optional, e.g. Friday at Lena\'s')} className="w-100" aria-label={t('Name of the evening')} />

                    <div className="game-setup-start">
                        <Button type="submit" label={t('Start the evening')} icon="pi pi-play" loading={starting} disabled={Boolean(missing)} />
                        <span className="game-setup-summary" aria-live="polite">{missing ?? t('{{count}} players', { count: filled.length })}</span>
                    </div>
                </form>
            </Panel>
        </QuickLayout>
    );
};

export default EveningNewPage;
