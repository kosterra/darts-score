import { useEffect, useState } from 'react';

import ScreenService from '../../services/screen.service';
import { ScreenGame } from './_screen.page';
import useWakeLock from '../../utils/use.wake.lock';
import usePageTitle from '../../utils/use.page.title';
import { formatDateTime } from '../../utils/dates';
import { t } from '../../utils/i18n';

const KEY = 'legmate.tv';
// how often a waiting TV asks whether a game was sent to it
const POLL_MS = 2500;

const storedSecret = () => {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
};
const storeSecret = (secret) => {
    try {
        if (secret) localStorage.setItem(KEY, secret);
        else localStorage.removeItem(KEY);
    } catch {
        // without storage the TV pairs again after a reload
    }
};

/**
 * A TV paired by a code, without a login: opened once in the TV's browser
 * at /tv, it shows a code; a member of a club sends a game to that code from
 * the game (Big screen), and the TV shows it. It stays paired for the
 * evening: the next game is sent the same way, the code small in a corner.
 */
const TvPage = () => {
    usePageTitle(t('Big screen'));
    const [pairing, setPairing] = useState(null);
    const [error, setError] = useState('');
    useWakeLock(true);

    useEffect(() => {
        let alive = true;
        let timer = null;
        let secret = storedSecret();
        const ask = async () => {
            try {
                if (!secret) {
                    const fresh = await ScreenService.pairTv();
                    secret = fresh.secret;
                    storeSecret(secret);
                }
                const found = await ScreenService.loadPairing(secret);
                if (alive) { setPairing(found); setError(''); }
            } catch (err) {
                // run out: a new code; else (no connection) try again
                if (err.data?.expired) { secret = null; storeSecret(null); }
                else if (alive) setError(err.message);
            }
            if (alive) timer = setTimeout(ask, POLL_MS);
        };
        ask();
        return () => { alive = false; clearTimeout(timer); };
    }, []);

    if (pairing?.token) {
        return <ScreenGame key={pairing.token} token={pairing.token} corner={<span className="tv-corner-code" title={t('The code of this TV')}><i className="pi pi-desktop" aria-hidden="true" />{pairing.code}</span>} />;
    }

    return (
        <div className="big-screen tv-waiting">
            <img src="/logo.svg" alt="" width="96" height="96" />
            <h1 className="tv-title">{t('Legmate on the big screen')}</h1>
            {pairing
                ? <>
                    <p className="tv-steps">{t('Start a game on your phone or tablet, tap Big screen there and enter this code:')}</p>
                    <span className="tv-code" aria-label={t('The code of this TV')}>{pairing.code.slice(0, 3)}<span className="tv-code-gap" />{pairing.code.slice(3)}</span>
                    <p className="tv-note">{t('The game appears here by itself, and so does every next game sent to this code, until {{date}}.', { date: formatDateTime(pairing.expiresAt) })}</p>
                </>
                : <i className="pi pi-spin pi-spinner tv-spinner" aria-hidden="true" />}
            {error && <p className="tv-note">{error}</p>}
        </div>
    );
};

export default TvPage;
