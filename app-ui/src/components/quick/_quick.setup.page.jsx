import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';

import X01Models from '../../models/x01.models';
import CricketModels from '../../models/cricket.models';
import { QuickCricketService, QuickX01Service } from '../../services/quick.game.service';
import QuickLayout from './quick.layout';
import { t } from '../../utils/i18n';

const GAMES = [{ label: t('X01'), value: 'x01' }, { label: t('Cricket'), value: 'cricket' }];
const SCORES = [{ label: '301', value: 301 }, { label: '501', value: 501 }];
const OUTS = [{ label: t('Double Out'), value: 'Double Out' }, { label: t('Straight Out'), value: 'Straight Out' }];
const LEGS = [{ label: t('1 leg'), value: 1 }, { label: t('Best of 3'), value: 3 }, { label: t('Best of 5'), value: 5 }];
const VARIANTS = [{ label: t('Standard'), value: 'Standard' }, { label: t('Cut-throat'), value: 'Cut-throat' }];
const IDS = ['q1', 'q2', 'q3', 'q4'];
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} '.-]{0,19}$/u;

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

// a setting with its choices, as on the setup pages of the club games
const Choice = ({ title, value, options, onChange }) => (
    <div>
        <p className="setting-title">{title}</p>
        <div className="row mx-0 mt-0 setting-body">
            <div className="col d-flex justify-content-center">
                <SelectButton value={value} options={options} onChange={(event) => event.value != null && onChange(event.value)} className="p-selectbutton-pills" aria-label={title} />
            </div>
        </div>
    </div>
);

/**
 * A quick game without an account: X01 or Cricket for one to four players,
 * who only need a name, in a few common setups. The game is played like a
 * club game, without the dart animation, and ends with its statistics.
 */
const QuickSetupPage = () => {
    const navigate = useNavigate();
    const toast = useRef(null);
    const remembered = readSetup();
    const [kind, setKind] = useState(remembered?.kind ?? 'x01');
    const [names, setNames] = useState(remembered?.names?.length ? remembered.names : ['', '']);
    const [startingScore, setStartingScore] = useState(remembered?.startingScore ?? 501);
    const [legOutMode, setLegOutMode] = useState(remembered?.legOutMode ?? 'Double Out');
    const [numberOfLegs, setNumberOfLegs] = useState(remembered?.numberOfLegs ?? 3);
    const [variant, setVariant] = useState(remembered?.variant ?? 'Standard');
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
        keepSetup({ kind, names: trimmed, startingScore, legOutMode, numberOfLegs, variant });
        const players = IDS.slice(0, trimmed.length);
        const quickPlayers = players.map((id, index) => ({ id, nickname: trimmed[index] }));
        const common = {
            isSoloGame: players.length === 1,
            numberOfPlayers: players.length,
            players,
            quickPlayers,
            currentPlayerTurn: players[0],
            flyingDarts: 'off',
        };
        try {
            if (kind === 'x01') {
                const game = await QuickX01Service.createX01Game({
                    ...X01Models.X01GameModel,
                    ...common,
                    startingScore,
                    legInMode: 'Straight In',
                    legOutMode,
                    setMode: 'Best of',
                    legMode: 'Best of',
                    numberOfSets: 1,
                    numberOfLegs,
                    startingPlayerSet: players[0],
                    startingPlayerLeg: players[0],
                    playerModels: Object.fromEntries(players.map(id => [id, { ...X01Models.X01PlayerModel, score: startingScore }])),
                });
                navigate(`/quick/x01/${game.id}`);
            } else {
                const game = await QuickCricketService.createCricketGame({
                    ...CricketModels.CricketGameModel,
                    ...common,
                    variant,
                    playerModels: Object.fromEntries(players.map(id => [id, { ...CricketModels.CricketPlayerModel, score: Number(CricketModels.CricketGameModel.startingScore) }])),
                });
                navigate(`/quick/cricket/${game.id}`);
            }
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: t('Start the game'), detail: error.message, life: 5000 });
            setStarting(false);
        }
    };

    return (
        <QuickLayout>
            <Toast ref={toast} position="bottom-right" />
            <Panel header={t('Quick game')} className="w-100 w-md-75 w-xxl-50 mx-auto">
                <form className="container" onSubmit={start}>
                    <p className="text-subtle fs-7 mt-0">
                        {t('Play right away, without an account: the players only need a name. The game and its statistics stay on this device for 30 days.')}{' '}
                        <Link to="/register">{t('Create an account')}</Link>{' '}{t('for a club with players, their statistics over time, badges, levels and all the settings.')}
                    </p>

                    <p className="game-setup-section-title">{t('Game')}</p>
                    <Choice title={t('Game')} value={kind} options={GAMES} onChange={setKind} />

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
                    {kind === 'x01'
                        ? <>
                            <Choice title={t('Score')} value={startingScore} options={SCORES} onChange={setStartingScore} />
                            <Choice title={t('Out')} value={legOutMode} options={OUTS} onChange={setLegOutMode} />
                            <Choice title={t('Legs')} value={numberOfLegs} options={LEGS} onChange={setNumberOfLegs} />
                        </>
                        : <Choice title={t('Variant')} value={variant} options={VARIANTS} onChange={setVariant} />
                    }

                    <div className="game-setup-start">
                        <Button type="submit" label={t('Start game')} icon="pi pi-play" loading={starting} disabled={Boolean(missing)} aria-label={t('Start game')} />
                        <span className="game-setup-summary" aria-live="polite">
                            {missing ?? (kind === 'x01'
                                ? `${startingScore} · ${legOutMode} · ${numberOfLegs === 1 ? t('1 leg') : t('best of {{numberOfLegs}} legs', { numberOfLegs: numberOfLegs })} · ${trimmed.length} ${trimmed.length === 1 ? t('player') : t('players')}`
                                : `Cricket ${variant} · ${trimmed.length === 1 ? t('{{count}} player', { count: 1 }) : t('{{count}} players', { count: trimmed.length })}`)}
                        </span>
                    </div>
                </form>
            </Panel>
        </QuickLayout>
    );
};

export default QuickSetupPage;
