import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

import AuthService from '../../services/auth.service';
import StatsService from '../../services/stats.service';
import { useAuth } from '../../utils/auth.context';
import { isInstalled } from '../../utils/install';
import { t } from '../../utils/i18n';

// what each step is, and where it is done
const STEPS = {
    clubProfile: { title: t('Give the club its face'), text: t('A logo and a few words about the club, under Edit club.'), to: (club) => `/my-clubs/${club.id}`, action: t('Edit club') },
    players: { title: t('Add your players'), text: t('Players without a login in a minute, or invite members by email so they get a login of their own.'), to: () => '/players', action: t('Players') },
    rules: { title: t('Decide how the club plays'), text: t('Which games, what a game starts with, and the formats of the club, under Edit club → Game rules.'), to: (club) => `/my-clubs/${club.id}`, action: t('Game rules') },
    firstGame: { title: t('Play the first game'), text: t('X01, Cricket or one of seven more games: tap the darts on the board, Legmate counts.'), to: () => '/x01', action: t('Play') },
    you: { title: t('Complete your player'), text: t('A picture and your country, so the others know who is at the oche.'), to: () => '/profile#player', action: t('Your player') },
    training: { title: t('Try a training'), text: t('X01 against the bot at your level, Around the Clock against the clock, or one of six more.'), to: () => '/training/x01', action: t('Train') },
    notifications: { title: t('Choose your notifications'), text: t('What you hear about, in the app or by mail: at once, once a day or once a week.'), to: () => '/profile#notifications', action: t('Notifications') },
    app: { title: t('Legmate as an app'), text: t('On the home screen of your phone it opens full screen, like an app.'), to: () => '/profile', action: t('How') },
};

/**
 * First steps on the Dashboard of a new account: for an admin of the club the
 * club's face, its players, how it plays, the first game and the own player;
 * for a member the own player, the first game, a training, the notifications
 * and Legmate as an app. Ticked from what is there; hidden with its cross (or
 * once all is done), for the account on every device.
 */
const FirstSteps = () => {
    const { user, setUser, activeClub, isGlobalAdmin } = useAuth();
    const [steps, setSteps] = useState(null);
    const show = Boolean(user && !isGlobalAdmin && activeClub && user.onboarding && !user.onboarding.firstStepsHiddenAt);

    useEffect(() => {
        if (!show) return;
        StatsService.loadFirstSteps().then(setSteps).catch(() => setSteps(null));
    }, [show, activeClub?.id]);

    if (!show || !steps) return null;
    const items = steps.items.map(item => ({ ...item, done: item.id === 'app' ? isInstalled() : item.done }));
    const done = items.filter(item => item.done).length;
    const all = done === items.length;
    const hide = () => AuthService.setOnboarding({ firstSteps: 'hidden' }).then(setUser).catch(() => {});

    return (
        <section className="first-steps" aria-labelledby="first-steps-title">
            <div className="first-steps-head">
                <div className="d-flex flex-column gap-1 min-w-0">
                    <h2 id="first-steps-title" className="first-steps-title">{all ? t('All done: you know your way around') : t('First steps')}</h2>
                    <span className="text-subtle fs-7">
                        {all
                            ? t('Everything is set up. Enjoy your games!')
                            : steps.role === 'admin'
                                ? t('Get your club going: {{done}} of {{count}} done.', { done, count: items.length })
                                : t('Find your way around: {{done}} of {{count}} done.', { done, count: items.length })}
                    </span>
                </div>
                <Button type="button" icon="pi pi-times" text rounded severity="secondary" size="small" aria-label={t('Hide the first steps')} title={t('Hide the first steps')} onClick={hide} />
            </div>
            <ProgressBar value={Math.round((done / items.length) * 100)} showValue={false} className="first-steps-bar" />
            {!all &&
                <ol className="first-steps-list">
                    {items.map(item => {
                        const words = STEPS[item.id];
                        if (!words) return null;
                        return (
                            <li key={item.id} className={`first-step ${item.done ? 'is-done' : ''}`}>
                                <span className="first-step-mark" aria-hidden="true"><i className={`pi ${item.done ? 'pi-check' : 'pi-circle'}`} /></span>
                                <span className="d-flex flex-column min-w-0 flex-grow-1">
                                    <span className="first-step-title">{words.title}{item.done && <span className="visually-hidden"> {t('(done)')}</span>}</span>
                                    {!item.done && <span className="text-subtle fs-8">{words.text}</span>}
                                </span>
                                {!item.done && <Link to={words.to(activeClub)} className="p-button p-button-sm p-button-secondary p-button-outlined text-decoration-none first-step-go">{words.action}</Link>}
                            </li>
                        );
                    })}
                </ol>}
            {all && <Button type="button" label={t('Hide')} icon="pi pi-check" size="small" className="align-self-start" onClick={hide} />}
        </section>
    );
};

export default FirstSteps;
