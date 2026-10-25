import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import QRCode from 'qrcode';

import EveningService from '../../services/evening.service';
import QuickLayout from '../quick/quick.layout';
import QuickSettings from '../quick/quick.settings';
import GameTypeIcon from '../elements/game.type.icon';
import { EveningAwards, EveningForm, EveningHeadToHead, EveningTable } from './evening.parts';
import { suggestNext } from '../../utils/evening.next';
import { QUICK_DEFAULTS, newQuickGame, quickSetupText } from '../../utils/quick.games';
import { formatDate, formatDateTime } from '../../utils/dates';
import { t, tn } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

const GAME_NAMES = { x01: 'X01', cricket: 'Cricket', elimination: 'Elimination' };
// the evening and the games follow on their own, for the phones following it
const REFRESH_MS = 20 * 1000;

// the setup of the next game, remembered per evening in this browser
const setupKey = (id) => `darts-score.evening.${id}.setup`;
const readSetup = (id) => {
    try {
        return JSON.parse(localStorage.getItem(setupKey(id)) ?? 'null');
    } catch {
        return null;
    }
};
const keepSetup = (id, setup) => {
    try {
        localStorage.setItem(setupKey(id), JSON.stringify(setup));
    } catch {
        // the next game starts from the defaults then
    }
};

/**
 * The next game: who plays (suggested, or tapped in the order they throw)
 * and the game with its few settings; Start opens it.
 */
const NextGame = ({ evening, onStart, busy }) => {
    const [settings, setSettings] = useState(() => ({ ...QUICK_DEFAULTS, ...(readSetup(evening.id) ?? {}) }));
    const [size, setSize] = useState(2);
    const suggestion = useMemo(() => suggestNext(evening.players, evening.games, size), [evening.players, evening.games, size]);
    const [chosen, setChosen] = useState(null);
    const players = chosen ?? suggestion;
    const toggle = (id) => setChosen(current => {
        const list = current ?? suggestion;
        if (list.includes(id)) return list.filter(entry => entry !== id);
        return list.length >= 4 ? list : [...list, id];
    });
    const nameOf = (id) => evening.players.find(player => player.id === id)?.name ?? '?';
    const change = (changes) => setSettings(current => {
        const next = { ...current, ...changes };
        keepSetup(evening.id, next);
        return next;
    });
    const ready = players.length >= 2 && players.length <= 4;

    return (
        <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column gap-2">
                <span className="text-subtle fs-8">{chosen ? t('Tap the players in the order they throw (2 to 4).') : t('Suggested: who played least, against someone new. Tap to choose others.')}</span>
                <div className="evening-players">
                    {evening.players.map(player => {
                        const place = players.indexOf(player.id);
                        return (
                            <button key={player.id} type="button" className={`evening-player ${place >= 0 ? 'is-chosen' : ''}`} onClick={() => toggle(player.id)} aria-pressed={place >= 0}>
                                {place >= 0 && <span className="evening-player-order">{place + 1}</span>}
                                {player.name}
                            </button>
                        );
                    })}
                </div>
                {!chosen &&
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-faint fs-8">{t('Players in a game')}</span>
                        {[2, 3, 4].filter(count => count <= evening.players.length).map(count => (
                            <Button key={count} type="button" label={String(count)} size="small" severity={size === count ? undefined : 'secondary'} text={size !== count} onClick={() => setSize(count)} />
                        ))}
                    </div>}
                {chosen && <Button type="button" label={t('Back to the suggestion')} icon="pi pi-replay" size="small" text className="align-self-start" onClick={() => setChosen(null)} />}
            </div>
            <QuickSettings settings={settings} onChange={change} />
            <div className="game-setup-start">
                <Button type="button" label={t('Start the game')} icon="pi pi-play" loading={busy} disabled={!ready} onClick={() => onStart(settings, players.map(id => ({ id, nickname: nameOf(id) })))} />
                <span className="game-setup-summary">{ready ? `${players.map(nameOf).join(' – ')} · ${quickSetupText(settings.kind, settings)}` : t('Choose 2 to 4 players')}</span>
            </div>
        </div>
    );
};

/**
 * A darts evening: the next game, the games going on, the table of the
 * evening, the awards, who beat whom and the form, all its games, the link
 * to follow it and the way to make it a club. Read-only (shared) for
 * everyone with its link: the table, the awards and the games.
 */
const EveningPage = ({ shared = false }) => {
    const { id, token } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const [evening, setEvening] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [qr, setQr] = useState('');

    const load = useCallback(() => (shared ? EveningService.loadShared(token) : EveningService.loadEvening(id))
        .then(loaded => { setEvening(loaded); setError(''); })
        .catch(err => setError(err.message)), [shared, token, id]);
    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const shareUrl = evening?.shareToken ? `${window.location.origin}/evening/shared/${evening.shareToken}` : '';
    useEffect(() => {
        if (sharing && shareUrl) QRCode.toDataURL(shareUrl, { margin: 1, width: 260 }).then(setQr).catch(() => setQr(''));
    }, [sharing, shareUrl]);

    if (!evening) {
        return (
            <QuickLayout suffix={t('· Darts evening')}>
                <div className="page-narrow">{error ? <Message severity="warn" className="w-100 justify-content-start" text={error} /> : <Lines count={6} />}</div>
            </QuickLayout>
        );
    }

    const nameOf = (playerId) => evening.players.find(player => player.id === playerId)?.name ?? '?';
    const title = evening.name || t('Darts evening of {{date}}', { date: formatDate(evening.createdAt) });
    const running = evening.games.filter(game => game.running);
    const report = evening.report;
    const owner = !shared;
    const adopted = Boolean(evening.club);

    const start = async (settings, players) => {
        setBusy(true);
        try {
            const game = await EveningService.addGame(evening.id, settings.kind, newQuickGame(settings.kind, settings, players));
            navigate(`/quick/${settings.kind}/${game.id}`);
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: t('Start the game'), detail: err.message, life: 5000 });
            setBusy(false);
        }
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.current?.show({ severity: 'success', summary: t('Link copied'), life: 2500 });
        } catch {
            // the link stays on the screen to copy by hand
        }
    };
    const makeClub = () => navigate(`/evening/${evening.id}/club`);

    return (
        <QuickLayout suffix={t('· Darts evening')}>
            <Toast ref={toast} position="bottom-right" />
            <div className="evening-page d-flex flex-column gap-4">
                <Panel header={title} icons={owner && !adopted ? <Button type="button" icon="pi pi-qrcode" label={t('Share')} size="small" text onClick={() => setSharing(true)} /> : null}>
                    <div className="d-flex flex-column gap-2">
                        <span className="text-subtle fs-7">
                            {formatDateTime(evening.createdAt)}{' · '}{tn(evening.players.length, '{{count}} player', '{{count}} players')}{' · '}{tn(report.played, '{{count}} game played', '{{count}} games played')}
                        </span>
                        <span className="d-flex flex-wrap gap-2">
                            {evening.players.map(player => <span key={player.id} className="filter-chip">{player.name}</span>)}
                        </span>
                        {shared && <span className="text-faint fs-8">{t('You follow this evening: it updates on its own.')}</span>}
                        {adopted && <Message severity="success" className="w-100 justify-content-start" text={t('This evening became a club: its players and games are there now.')} />}
                    </div>
                </Panel>

                {owner && !adopted &&
                    <Panel header={t('Next game')}>
                        <NextGame evening={evening} onStart={start} busy={busy} />
                    </Panel>}

                {running.length > 0 &&
                    <Panel header={t('Going on')}>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {running.map(game => (
                                <li key={game.id} className="evening-game">
                                    <GameTypeIcon type={game.kind} />
                                    <span className="flex-grow-1 min-w-0 text-truncate">{game.players.map(nameOf).join(' – ')}</span>
                                    {owner && <Link to={`/quick/${game.kind}/${game.id}`} className="p-button p-button-sm text-decoration-none"><i className="pi pi-play me-2" />{t('Go on')}</Link>}
                                </li>
                            ))}
                        </ul>
                    </Panel>}

                <Panel header={t('Table of the evening')}>
                    {report.played === 0
                        ? <span className="text-faint">{t('The table fills with the first game.')}</span>
                        : <EveningTable report={report} />}
                </Panel>

                {report.awards.length > 0 &&
                    <Panel header={t('Awards of the evening')}>
                        <EveningAwards report={report} nameOf={nameOf} />
                    </Panel>}

                {report.played >= 2 &&
                    <div className="row g-4">
                        <div className="col-12 col-xl-6">
                            <Panel header={t('Who beat whom')} className="h-100">
                                <EveningHeadToHead report={report} players={evening.players} />
                            </Panel>
                        </div>
                        {Object.values(report.form).some(values => values.length) &&
                            <div className="col-12 col-xl-6">
                                <Panel header={t('Form: X01 average game by game')} className="h-100">
                                    <EveningForm report={report} players={evening.players} />
                                </Panel>
                            </div>}
                    </div>}

                {evening.games.length > 0 &&
                    <Panel header={t('All games')}>
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {evening.games.map(game => (
                                <li key={game.id} className="evening-game">
                                    <GameTypeIcon type={game.kind} />
                                    <span className="d-flex flex-column min-w-0 flex-grow-1">
                                        <span className="text-default text-truncate">
                                            {game.players.map(playerId => <span key={playerId} className={playerId === game.winner ? 'fw-bold' : ''}>{playerId === game.winner ? '🏆 ' : ''}{nameOf(playerId)}</span>).reduce((list, item, index) => (index ? [...list, ' – ', item] : [item]), [])}
                                        </span>
                                        <span className="text-faint fs-8">{t(GAME_NAMES[game.kind])} · {formatDateTime(game.createdAt)}{game.running ? ` · ${t('going on')}` : ''}</span>
                                    </span>
                                    {owner && game.finished && <Link to={`/quick/stats/${game.kind}/${game.id}`} className="p-button p-button-sm p-button-text text-decoration-none" aria-label={t('Statistics')}><i className="pi pi-chart-bar" /></Link>}
                                </li>
                            ))}
                        </ul>
                    </Panel>}

                {owner && !adopted &&
                    <div className="evening-club">
                        <i className="pi pi-users" aria-hidden="true" />
                        <span className="d-flex flex-column gap-1 flex-grow-1 min-w-0">
                            <span className="text-default fw-semibold">{t('Keep playing together?')}</span>
                            <span className="text-subtle fs-7">{t('Make this a club: with an account, the players of tonight and the games played become a club, with statistics over time, badges and levels.')}</span>
                        </span>
                        <Button type="button" label={t('Make this a club')} icon="pi pi-arrow-right" iconPos="right" size="small" onClick={makeClub} />
                    </div>}
            </div>

            <Dialog header={t('Follow the evening')} visible={sharing} onHide={() => setSharing(false)} className="evening-share" dismissableMask>
                <div className="d-flex flex-column align-items-center gap-3 text-center">
                    <span className="text-subtle fs-7">{t('Friends scan the code or open the link: they see the table, the awards and the games on their phones, as it goes on. Only this device plays.')}</span>
                    {qr && <img src={qr} alt={t('QR code of the evening')} width="220" height="220" className="support-qr" />}
                    <code className="evening-share-link">{shareUrl}</code>
                    <Button type="button" label={t('Copy the link')} icon="pi pi-copy" size="small" onClick={copy} />
                </div>
            </Dialog>
        </QuickLayout>
    );
};

export default EveningPage;
