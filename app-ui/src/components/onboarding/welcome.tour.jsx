import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

// the steps: an anchor is a part of the menu (data-tour); without one the step stands in the middle
const STEPS = [
    { id: 'welcome' },
    { id: 'dashboard', anchor: 'dashboard', title: t('Your Dashboard'), text: t('What waits for you, your favourite games to start again with one tap, and your form. Arrange it as you like.') },
    { id: 'play', anchor: 'play', title: t('Play'), text: t('Start a game of X01, Cricket, Elimination and more, or train on your own against the bot. You tap the darts on the board, Legmate counts.') },
    { id: 'club', anchor: 'my-club', title: t('Your club'), text: t('The club at a glance: its players, games, trainings, badges and tournaments.') },
    { id: 'profile', anchor: 'profile', title: t('You'), text: t('Your player with nickname and picture, your darts, how you like to play, and your notifications.') },
    { id: 'help', anchor: 'about', title: t('Rules and help'), text: t('Every game explains its rules while you play. Under About Legmate you find the guides for players and admins, and what is new.') },
    { id: 'done', title: t('Ready for the oche!'), text: t('Your first steps wait on the Dashboard and tick themselves off as you go. Have fun!') },
];
const COUNTED = STEPS.filter(step => step.anchor).length;
const GAP = 14;
const CARD_WIDTH = 340;

// the part of the menu a step shows: the one on screen, else the menu button on a phone
const anchorOf = (step) => {
    if (!step?.anchor) return null;
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const own = [...document.querySelectorAll(`[data-tour="${step.anchor}"]`)].find(visible);
    if (own) return { el: own, viaMenu: false };
    const menu = [...document.querySelectorAll('[data-tour="menu"]')].find(visible);
    return menu ? { el: menu, viaMenu: true } : null;
};

// where the card goes: beside the spot when there is room, else above or below it
const placeCard = (rect, card) => {
    const w = Math.min(CARD_WIDTH, window.innerWidth - 32);
    const h = card?.offsetHeight ?? 220;
    const clampX = (x) => Math.max(16, Math.min(x, window.innerWidth - w - 16));
    const clampY = (y) => Math.max(16, Math.min(y, window.innerHeight - h - 16));
    if (!rect) return { left: (window.innerWidth - w) / 2, top: Math.max(16, (window.innerHeight - h) / 2), width: w };
    if (rect.right + GAP + w + 16 <= window.innerWidth) return { left: rect.right + GAP, top: clampY(rect.top + rect.height / 2 - h / 2), width: w };
    if (rect.top - GAP - h >= 16) return { left: clampX(rect.left + rect.width / 2 - w / 2), top: rect.top - GAP - h, width: w };
    return { left: clampX(rect.left + rect.width / 2 - w / 2), top: clampY(rect.bottom + GAP), width: w };
};

/**
 * The welcome tour of a new account: a few steps through the menu, each part
 * lit and explained, on a phone the menu button. Once, on the Dashboard;
 * skipped or finished it is done for the account on every device, and can be
 * started again from the profile.
 */
const WelcomeTour = () => {
    const { user, setUser, isGlobalAdmin, activeClub } = useAuth();
    const { pathname } = useLocation();
    const [index, setIndex] = useState(0);
    const [closed, setClosed] = useState(false);
    const [layout, setLayout] = useState({ rect: null, viaMenu: false });
    const cardRef = useRef(null);

    const show = Boolean(user && !isGlobalAdmin && activeClub && user.onboarding && !user.onboarding.tourDoneAt && pathname === '/' && !closed);
    const step = STEPS[index];

    // a new start (from the profile) begins at the first step
    useEffect(() => {
        if (user?.onboarding && !user.onboarding.tourDoneAt) { setClosed(false); setIndex(0); }
    }, [user?.onboarding?.tourDoneAt]); // eslint-disable-line react-hooks/exhaustive-deps

    const measure = useCallback(() => {
        const anchor = anchorOf(step);
        const r = anchor?.el.getBoundingClientRect();
        setLayout({ rect: r ? { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null, viaMenu: Boolean(anchor?.viaMenu) });
    }, [step]);

    // the part of the menu in sight once, when its step comes
    useEffect(() => {
        if (show) anchorOf(step)?.el.scrollIntoView({ block: 'nearest' });
    }, [show, step]);

    useLayoutEffect(() => {
        if (!show) return undefined;
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
    }, [show, measure]);

    // the card is measured once it is there, for its place
    const [place, setPlace] = useState(null);
    useLayoutEffect(() => {
        if (show) setPlace(placeCard(layout.rect, cardRef.current));
    }, [show, layout, index]);

    useEffect(() => { if (show) cardRef.current?.querySelector('.tour-next')?.focus(); }, [show, index, Boolean(place)]); // eslint-disable-line react-hooks/exhaustive-deps

    const finish = useCallback(() => {
        setClosed(true);
        AuthService.setOnboarding({ tour: 'done' }).then(setUser).catch(() => { /* shown again next time, no harm */ });
    }, [setUser]);
    const next = useCallback(() => (index < STEPS.length - 1 ? setIndex(index + 1) : finish()), [index, finish]);
    const back = useCallback(() => setIndex(Math.max(0, index - 1)), [index]);

    useEffect(() => {
        if (!show) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') finish();
            else if (event.key === 'ArrowRight') next();
            else if (event.key === 'ArrowLeft') back();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [show, finish, next, back]);

    if (!show) return null;

    const { rect, viaMenu } = layout;
    const counted = STEPS.slice(0, index + 1).filter(entry => entry.anchor).length;
    const title = step.id === 'welcome' ? t('Welcome to Legmate, {{name}}!', { name: user.firstname }) : step.title;
    const text = step.id === 'welcome' ? t('A quick look around, in five short steps. You can leave the tour at any time.') : step.text;
    const pad = 6;

    return createPortal(
        <div className="tour-layer">
            {rect
                ? <div className="tour-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }} />
                : <div className="tour-dim" />}
            <div ref={cardRef} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text" style={place ?? { visibility: 'hidden' }}>
                {step.anchor && <span className="tour-count">{t('{{step}} of {{count}}', { step: counted, count: COUNTED })}</span>}
                <h2 id="tour-title" className="tour-title">{title}</h2>
                <p id="tour-text" className="tour-text">
                    {viaMenu && <span className="tour-where">{t('In the menu:')}{' '}</span>}
                    {text}
                </p>
                <div className="tour-actions">
                    {step.id !== 'done' && <Button type="button" label={t('Skip the tour')} size="small" text severity="secondary" onClick={finish} />}
                    <span className="flex-grow-1" />
                    {index > 0 && step.id !== 'done' && <Button type="button" label={t('Back')} size="small" severity="secondary" outlined onClick={back} />}
                    <Button
                        type="button"
                        className="tour-next"
                        size="small"
                        label={step.id === 'welcome' ? t('Show me') : step.id === 'done' ? t('Let\'s play') : t('Next')}
                        icon={step.id === 'done' ? 'pi pi-check' : 'pi pi-arrow-right'}
                        iconPos="right"
                        onClick={next}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default WelcomeTour;
