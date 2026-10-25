import { SelectButton } from 'primereact/selectbutton';

import { QUICK_GAMES, QUICK_LEGS, QUICK_OUTS, QUICK_SCORES, QUICK_VARIANTS } from '../../utils/quick.games';
import { t } from '../../utils/i18n';

// a setting with its choices, as on the setup pages of the club games
export const Choice = ({ title, value, options, onChange }) => (
    <div>
        <p className="setting-title">{title}</p>
        <div className="row mx-0 mt-0 setting-body">
            <div className="col d-flex justify-content-center">
                <SelectButton value={value} options={options} onChange={(event) => event.value != null && onChange(event.value)} className="p-selectbutton-pills flex-wrap" aria-label={title} />
            </div>
        </div>
    </div>
);

/**
 * The setup of a quick game: the game (when "withGame") and its few settings.
 * settings: { kind, startingScore, legOutMode, numberOfLegs, variant,
 * targetScore, gameOutMode }; onChange(changes).
 */
const QuickSettings = ({ settings, onChange, withGame = true }) => (
    <>
        {withGame && <Choice title={t('Game')} value={settings.kind} options={QUICK_GAMES} onChange={(kind) => onChange({ kind })} />}
        {settings.kind === 'x01' &&
            <>
                <Choice title={t('Score')} value={settings.startingScore} options={QUICK_SCORES} onChange={(startingScore) => onChange({ startingScore })} />
                <Choice title={t('Out')} value={settings.legOutMode} options={QUICK_OUTS} onChange={(legOutMode) => onChange({ legOutMode })} />
                <Choice title={t('Legs')} value={settings.numberOfLegs} options={QUICK_LEGS} onChange={(numberOfLegs) => onChange({ numberOfLegs })} />
            </>}
        {settings.kind === 'cricket' && <Choice title={t('Variant')} value={settings.variant} options={QUICK_VARIANTS} onChange={(variant) => onChange({ variant })} />}
        {settings.kind === 'elimination' &&
            <>
                <Choice title={t('Target')} value={settings.targetScore} options={QUICK_SCORES} onChange={(targetScore) => onChange({ targetScore })} />
                <Choice title={t('Out')} value={settings.gameOutMode} options={QUICK_OUTS} onChange={(gameOutMode) => onChange({ gameOutMode })} />
            </>}
    </>
);

export default QuickSettings;
