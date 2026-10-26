import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import ScreenService from '../../services/screen.service';
import BigScreenX01 from './big.screen.x01';
import { BigScreenClock, BigScreenCricket, BigScreenElimination, BigScreenEveningTable, BigScreenRules } from './big.screen.games';
import { newVisits } from './screen.visits';
import CallerButton from '../games/common/caller.button';
import OneEightyCelebration from '../games/common/one.eighty.celebration';
import useWakeLock from '../../utils/use.wake.lock';
import usePageTitle from '../../utils/use.page.title';
import { call, callsForVisit } from '../../utils/caller';
import { outModeOf } from '../../utils/x01.rules';
import { replayX01 } from '../../rules/x01';
import { t } from '../../utils/i18n';

// how often the screen asks for the game: about as fast as the next visit can come
const POLL_MS = 1500;

/**
 * What a screen shows, from the answer of the API: the game (for a darts
 * evening the one running now, or null between games), its kind, its players
 * and the title. An X01 game is worked out from its visits by the rules, as
 * the scorer's device does.
 */
const screenOf = (answer) => {
    const evening = answer.kind === 'evening' ? answer.evening : null;
    const { game } = answer;
    const kind = evening ? game?.kind ?? null : answer.kind;
    const players = evening ? (game?.quickPlayers ?? []) : answer.players;
    const worked = kind === 'x01' && game?.visits ? replayX01(game) : game;
    return { ...answer, view: { kind, game: worked, players, evening, title: evening ? (evening.name || t('Darts evening')) : null } };
};

// the display of a game by its kind
const DISPLAYS = { x01: BigScreenX01, cricket: BigScreenCricket, elimination: BigScreenElimination, clock: BigScreenClock, rules: BigScreenRules };

/**
 * The big screen of a running game, without a login: a TV or a second
 * tablet at the club follows the game of a screen link (token), the screen
 * kept awake. A tap makes it full screen; with the sound on it calls the
 * visits, and a 180 is celebrated large. corner: what else to show, e.g.
 * the code of a paired TV.
 */
export const ScreenGame = ({ token, corner = null }) => {
    usePageTitle(t('Big screen'));
    const [screen, setScreen] = useState(null);
    const [error, setError] = useState('');
    const [oneEighty, setOneEighty] = useState(null);
    // the same function on every answer, or the celebration would start over with each one
    const endOneEighty = useCallback(() => setOneEighty(null), []);
    const [fullscreen, setFullscreen] = useState(false);
    const last = useRef(null);
    useWakeLock(Boolean(screen) && !error);

    useEffect(() => {
        let alive = true;
        let timer = null;
        const load = async () => {
            try {
                const next = screenOf(await ScreenService.loadScreen(token));
                if (!alive) return;
                // the visits of an X01 game since the last answer (the same game): called, a 180 celebrated
                const now = next.view.kind === 'x01' ? next.view.game : null;
                const before = last.current?.view.kind === 'x01' && last.current.view.game?.id === now?.id ? last.current.view.game : null;
                for (const visit of newVisits(before, now)) {
                    const name = next.view.players.find(player => player.id === visit.playerId)?.nickname ?? '';
                    if (visit.points === 180) setOneEighty({ key: Date.now(), name });
                    const nextId = now.currentPlayerTurn;
                    call(callsForVisit(
                        { score: visit.points, busted: visit.busted, wonLeg: visit.wonLeg, wonSet: visit.wonSet, wonMatch: visit.wonMatch },
                        now.hasWinner ? null : {
                            name: next.view.players.find(player => player.id === nextId)?.nickname ?? '',
                            score: now.playerModels[nextId]?.score ?? 0,
                            outMode: outModeOf(now, nextId),
                            legStarts: visit.wonLeg,
                        },
                    ));
                }
                last.current = next;
                setScreen(next);
                setError('');
            } catch (err) {
                if (!alive) return;
                // a link run out ends the screen; a connection lost is tried again
                if (err.data?.expired) { setError(err.message); return; }
            }
            if (alive) timer = setTimeout(load, POLL_MS);
        };
        load();
        return () => { alive = false; clearTimeout(timer); };
    }, [token]);

    useEffect(() => {
        const changed = () => setFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', changed);
        return () => document.removeEventListener('fullscreenchange', changed);
    }, []);
    const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});

    if (error) {
        return (
            <div className="big-screen big-screen-message">
                <i className="pi pi-desktop" aria-hidden="true" />
                <p>{error}</p>
            </div>
        );
    }
    if (!screen) return <div className="big-screen big-screen-message"><i className="pi pi-spin pi-spinner" aria-hidden="true" /></div>;

    return (
        <>
            {(() => {
                const { kind, game, players, evening, title } = screen.view;
                const Display = DISPLAYS[kind];
                if (game && Display) return <Display game={game} players={players} club={screen.club} title={title} />;
                if (evening) return <BigScreenEveningTable evening={evening} />;
                return null;
            })()}
            <div className="big-screen-controls">
                {corner}
                <CallerButton />
                <button type="button" className="game-rules-toggle" onClick={toggleFullscreen} aria-pressed={fullscreen}>
                    <i className={`pi ${fullscreen ? 'pi-window-minimize' : 'pi-window-maximize'}`} aria-hidden="true" />
                    <span>{fullscreen ? t('Leave full screen') : t('Full screen')}</span>
                </button>
            </div>
            <OneEightyCelebration celebration={oneEighty} onDone={endOneEighty} />
        </>
    );
};

// the page of a screen link: /screen/<token>
const ScreenPage = () => {
    const { token } = useParams();
    return <ScreenGame token={token} />;
};

export default ScreenPage;
