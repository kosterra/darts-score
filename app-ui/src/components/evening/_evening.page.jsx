import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { Toast } from 'primereact/toast';
import QRCode from 'qrcode';
import dayjs from 'dayjs';
import BigScreenButton from '../screen/big.screen.button';

import EveningService from '../../services/evening.service';
import QuickLayout from '../quick/quick.layout';
import QuickSettings from '../quick/quick.settings';
import GameTypeIcon from '../elements/game.type.icon';
import GameTypeTag from '../elements/game.type.tag';
import GameStatusTag from '../elements/game.status.tag';
import GamePlayers from '../dashboard/widgets/game.players';
import { EveningAwards, EveningForm, EveningHeadToHead, EveningTable } from './evening.parts';
import { suggestNext } from '../../utils/evening.next';
import { QUICK_DEFAULTS, newQuickGame, quickSetupText } from '../../utils/quick.games';
import { formatDate, formatDateTime } from '../../utils/dates';
import { resolvePlayerInitials } from '../../utils/image.utils';
import { t, tn } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';
import usePageTitle from '../../utils/use.page.title';

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

    // games played tonight by each, under their name
    const playedBy = (id) => evening.games.filter(game => game.finished && game.players.includes(id)).length;

    return (
        <div className="evening-next page-narrow">
            <p className="game-setup-section-title">{t('Players')}</p>
            <p className="text-faint fs-8 mt-0">{chosen ? t('Tap the players in the order they throw (2 to 4).') : t('Suggested: who played least, against someone new. Tap to choose others.')}</p>
            {/* the cards of the setup pages, numbered in the order they throw */}
            <div className="player-picker-grid" role="group" aria-label={t('Players of the evening')}>
                {evening.players.map(player => {
                    const place = players.indexOf(player.id);
                    const played = playedBy(player.id);
                    return (
                        <button key={player.id} type="button" className={`player-pick-card ${place >= 0 ? 'is-chosen' : ''}`} onClick={() => toggle(player.id)} aria-pressed={place >= 0}>
                            {place >= 0 && <span className="player-pick-number" aria-label={t('Throws {{value}}.', { value: place + 1 })}>{place + 1}</span>}
                            <Avatar label={resolvePlayerInitials(player.name, '')} shape="circle" className="avatar-md" />
                            <span className="player-pick-name">{player.name}</span>
                            <span className="player-pick-detail">{played ? tn(played, '{{count}} game played', '{{count}} games played') : t('Not played yet')}</span>
                        </button>
                    );
                })}
            </div>
            {chosen
                ? <Button type="button" label={t('Back to the suggestion')} icon="pi pi-replay" size="small" text className="mt-2" onClick={() => setChosen(null)} />
                : <div className="mt-3">
                    <p className="setting-title">{t('Players in a game')}</p>
                    <div className="row mx-0 mt-0 setting-body">
                        <div className="col d-flex justify-content-center">
                            <SelectButton
                                value={size}
                                options={[2, 3, 4].filter(count => count <= evening.players.length).map(count => ({ label: String(count), value: count }))}
                                onChange={(e) => e.value && setSize(e.value)}
                                className="p-selectbutton-pills flex-wrap"
                                aria-label={t('Players in a game')}
                            />
                        </div>
                    </div>
                </div>}
            <p className="game-setup-section-title mt-4">{t('Game')}</p>
            <div className="evening-settings">
                <QuickSettings settings={settings} onChange={change} />
            </div>
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
    // the tab, and the preview of a shared link, name the evening
    usePageTitle(evening?.name || t('Darts evening'));

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
    // the players as the game lists of the app read them
    const names = new Map(evening.players.map(player => [player.id, { nickname: player.name }]));
    // what was played, without the name of the game (its tag says it)
    const formatOf = (game) => (game.kind === 'x01' ? quickSetupText('x01', game.setup) : quickSetupText(game.kind, game.setup).split(' · ').slice(1).join(' · '));
    const title = evening.name || t('Darts evening of {{date}}', { date: formatDate(evening.createdAt) });
    const running = evening.games.filter(game => game.running);
    const report = evening.report;
    const owner = !shared;
    const adopted = Boolean(evening.club);

    // a game of the evening, as the recent games of the Dashboard: when, what, who with their result
    const gameEntry = (game) => (
        <li key={game.id} className={`timeline-entry ${game.running ? 'timeline-running' : ''}`}>
            <span className="timeline-time text-faint fs-8">{dayjs(game.createdAt).format('HH:mm')}</span>
            <GameTypeIcon type={game.kind} />
            <div className="timeline-body">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <GameTypeTag type={game.kind} />
                    <span className="text-faint fs-8">{formatOf(game)}</span>
                    <GameStatusTag running={game.running} />
                </div>
                <GamePlayers game={{ type: game.kind, players: game.results ?? game.players.map(player => ({ player, isWinner: player === game.winner })) }} players={names} withSets={false} />
            </div>
            {owner &&
                <div className="row-actions">
                    {game.running
                        ? <Button type="button" icon="pi pi-play" aria-label={t('Continue this game')} title={t('Continue playing')} onClick={() => navigate(`/quick/${game.kind}/${game.id}`)} />
                        : <Button type="button" icon="pi pi-chart-bar" severity="secondary" aria-label={t('Statistics of this game')} title={t('Show statistics')} onClick={() => navigate(`/quick/stats/${game.kind}/${game.id}`)} />}
                </div>}
        </li>
    );

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
                {/* the evening on top, as the Dashboard: its name, who plays, and what it can do */}
                <header className="dashboard-header hero-header rounded-2 p-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex flex-column gap-1 min-w-0">
                        <h1 className="fs-2 fw-semibold text-default m-0 text-break">{title}</h1>
                        {/* the date, or only the time when the title names the date already */}
                        <span className="text-subtle">{t('Darts evening')}{' · '}{evening.name ? formatDateTime(evening.createdAt) : dayjs(evening.createdAt).format('HH:mm')}</span>
                        <span className="evening-header-players">{evening.players.map(player => player.name).join(' · ')}</span>
                        {shared && <span className="text-faint fs-8">{t('You follow this evening: it updates on its own.')}</span>}
                    </div>
                    {owner && !adopted &&
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            {/* the evening on a TV: it follows its running game, the table in between */}
                            <BigScreenButton create={() => EveningService.screenLink(evening.id)} send={(code) => EveningService.sendToTv(evening.id, code)} />
                            <button type="button" className="game-rules-toggle" onClick={() => setSharing(true)} title={t('Follow the evening')}>
                                <i className="pi pi-qrcode" aria-hidden="true" />
                                <span>{t('Share')}</span>
                            </button>
                        </div>}
                    {adopted && <Message severity="success" className="w-100 justify-content-start" text={t('This evening became a club: its players and games are there now.')} />}
                </header>

                {owner && !adopted &&
                    <Panel header={t('Next game')}>
                        <NextGame evening={evening} onStart={start} busy={busy} />
                    </Panel>}

                {running.length > 0 &&
                    <Panel header={t('Going on')}>
                        <ol className="timeline list-unstyled m-0">
                            {running.map(gameEntry)}
                        </ol>
                    </Panel>}

                <Panel header={t('Table of the evening')}>
                    {report.played === 0
                        ? <span className="text-faint fs-7">{t('The table fills with the first game.')}</span>
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
                        <ol className="timeline list-unstyled m-0">
                            {evening.games.map(gameEntry)}
                        </ol>
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
