import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import ScreenService from '../../services/screen.service';
import BigScreenX01 from './big.screen.x01';
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
 * The big screen of a running game, without a login: a TV or a second
 * tablet at the club opens the link (or its QR code) made from the game and
 * follows it, the screen kept awake. A tap makes it full screen; with the
 * sound on it calls the visits, and a 180 is celebrated large.
 */
const ScreenPage = () => {
    const { token } = useParams();
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
                const answer = await ScreenService.loadScreen(token);
                if (!alive) return;
                // worked out from its visits by the rules of the game, as the scorer's device does
                const next = { ...answer, game: answer.game?.visits ? replayX01(answer.game) : answer.game };
                const before = last.current?.game;
                for (const visit of newVisits(before, next.game)) {
                    const name = next.players.find(player => player.id === visit.playerId)?.nickname ?? '';
                    if (visit.points === 180) setOneEighty({ key: Date.now(), name });
                    const nextId = next.game.currentPlayerTurn;
                    call(callsForVisit(
                        { score: visit.points, busted: visit.busted, wonLeg: visit.wonLeg, wonSet: visit.wonSet, wonMatch: visit.wonMatch },
                        next.game.hasWinner ? null : {
                            name: next.players.find(player => player.id === nextId)?.nickname ?? '',
                            score: next.game.playerModels[nextId]?.score ?? 0,
                            outMode: outModeOf(next.game, nextId),
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
            <BigScreenX01 game={screen.game} players={screen.players} club={screen.club} />
            <div className="big-screen-controls">
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

export default ScreenPage;
