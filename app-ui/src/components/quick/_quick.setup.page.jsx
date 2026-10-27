import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';

import { QuickCricketService, QuickEliminationService, QuickX01Service } from '../../services/quick.game.service';
import { QUICK_DEFAULTS, QUICK_GAMES, QUICK_NAME, newQuickGame, quickSetupText } from '../../utils/quick.games';
import QuickSettings, { Choice } from './quick.settings';
import QuickLayout from './quick.layout';
import { t } from '../../utils/i18n';
import useGameRules from '../games/common/game.rules';

const IDS = ['q1', 'q2', 'q3', 'q4'];
const NAME = QUICK_NAME;

// what the last quick game was set up with, to start the next one from
const SETUP = 'darts-score.quickSetup';
const readSetup = () => {
    try {
        return JSON.parse(localStorage.getItem(SETUP) ?? 'null');
    } catch {
        return null;
    }
};
const keepSetup = (setup) => {
    try {
        localStorage.setItem(SETUP, JSON.stringify(setup));
    } catch {
        // nothing to remember then
    }
};

/**
 * A quick game without an account: X01, Cricket or Elimination for one to
 * four players, who only need a name, in a few common setups. The game is played like a
 * club game, without the dart animation, and ends with its statistics.
 */
const QuickSetupPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const remembered = readSetup();
    const [settings, setSettings] = useState({ ...QUICK_DEFAULTS, ...(remembered ?? {}) });
    const { kind } = settings;
    // the rules of the game chosen, opened from the title of the setup
    const [rulesButton, rules] = useGameRules(kind);
    const [names, setNames] = useState(remembered?.names?.length ? remembered.names : ['', '']);
    const [starting, setStarting] = useState(false);

    const trimmed = names.map(name => name.trim());
    const invalid = trimmed.some(name => !NAME.test(name));
    const twice = new Set(trimmed.map(name => name.toLowerCase())).size !== trimmed.length;
    const missing = invalid ? t('Give every player a name') : twice ? t('Every player needs a name of their own') : null;

    const setName = (index, value) => setNames(current => current.map((name, i) => i === index ? value : name));

    const start = async (event) => {
        event.preventDefault();
        if (missing) return;
        setStarting(true);
        keepSetup({ ...settings, names: trimmed });
        const players = IDS.slice(0, trimmed.length).map((id, index) => ({ id, nickname: trimmed[index] }));
        const game = newQuickGame(kind, settings, players);
        try {
            const service = { x01: () => QuickX01Service.createX01Game(game), cricket: () => QuickCricketService.createCricketGame(game), elimination: () => QuickEliminationService.createEliminationGame(game) }[kind];
            const created = await service();
            navigate(`/quick/${kind}/${created.id}`);
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Start the game'), detail: error.message, life: 5000 });
            setStarting(false);
        }
    };

    return (
        <QuickLayout>
            <Toast ref={toast} position="bottom-right" />
            <Panel header={t('Quick game')} className="page-narrow" icons={rulesButton}>
                {rules}
                <form className="container" onSubmit={start}>
                    <p className="text-subtle fs-7 mt-0">
                        {t('Play right away, without an account: the players only need a name. The game and its statistics stay on this device for 30 days; a game not finished is deleted 3 days after its last visit.')}{' '}
                        <Link to="/register">{t('Create an account')}</Link>{' '}{t('for a club with players, their statistics over time, badges, levels and all the settings.')}
                    </p>
                    <Link to="/evening/new" className="quick-evening-link">
                        <i className="pi pi-users" aria-hidden="true" />
                        <span className="d-flex flex-column">
                            <span className="text-default fw-semibold">{t('Playing several games tonight?')}</span>
                            <span className="text-subtle fs-8">{t('Start a darts evening: up to eight players, game after game, a table of the evening and awards at the end.')}</span>
                        </span>
                        <i className="pi pi-chevron-right ms-auto" aria-hidden="true" />
                    </Link>

                    <p className="game-setup-section-title">{t('Game')}</p>
                    <Choice title={t('Game')} value={kind} options={QUICK_GAMES} onChange={(value) => setSettings(current => ({ ...current, kind: value }))} />

                    <p className="game-setup-section-title mt-4">{t('Players')}</p>
                    <div className="quick-names">
                        {names.map((name, index) => (
                            <div key={index} className="quick-name">
                                <span className="quick-name-number" aria-hidden="true">{index + 1}</span>
                                <InputText
                                    value={name}
                                    onChange={(event) => setName(index, event.target.value)}
                                    placeholder={t('Player {{value}}', { value: index + 1 })}
                                    aria-label={t('Name of player {{value}}', { value: index + 1 })}
                                    maxLength={20}
                                    className="flex-grow-1"
                                />
                                {names.length > 1 &&
                                    <Button type="button" icon="pi pi-times" text rounded severity="secondary" aria-label={t('Remove player {{value}}', { value: index + 1 })} onClick={() => setNames(current => current.filter((_, i) => i !== index))} />}
                            </div>
                        ))}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            {names.length < 4
                                ? <Button type="button" label={t('Add a player')} icon="pi pi-plus" size="small" text onClick={() => setNames(current => [...current, ''])} />
                                : <span />}
                            <span className="text-faint fs-8">{t('Up to four players, in the order they throw.')}</span>
                        </div>
                    </div>

                    <p className="game-setup-section-title mt-4">{t('Setup')}</p>
                    <QuickSettings settings={settings} onChange={(changes) => setSettings(current => ({ ...current, ...changes }))} withGame={false} />

                    <div className="game-setup-start">
                        <Button type="submit" label={t('Start game')} icon="pi pi-play" loading={starting} disabled={Boolean(missing)} aria-label={t('Start game')} />
                        <span className="game-setup-summary" aria-live="polite">
                            {missing ?? `${quickSetupText(kind, settings)} · ${trimmed.length === 1 ? t('{{count}} player', { count: 1 }) : t('{{count}} players', { count: trimmed.length })}`}
                        </span>
                    </div>
                </form>
            </Panel>
        </QuickLayout>
    );
};

export default QuickSetupPage;
