import { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';

import NotificationService from '../../services/notification.service';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

// the groups of topics, and what each topic is about (see rules/notifications.js)
const GROUPS = {
    games: { title: t('Games and badges'), hint: t('About your own games, trainings and progress.') },
    club: { title: t('Your clubs'), hint: t('What your clubs achieve together, and your requests to join.') },
    admin: { title: t('As a club admin'), hint: t('What needs an admin of your club.') },
    global: { title: t('As a global admin'), hint: t('What needs a look across the installation.') },
    security: { title: t('Your account'), hint: t('Always sent, so you notice when someone else uses your account.') },
};
const TOPICS = {
    badges: { title: t('Badges'), hint: t('A badge you earned.') },
    level: { title: t('Level'), hint: t('You reached the next level.') },
    records: { title: t('Records'), hint: t('A new personal best someone else entered for you, and your club record beaten.') },
    shame: { title: t('Hall of Shame'), hint: t('A Hall of Shame badge you got or washed off.') },
    rating: { title: t('Club rating'), hint: t('You moved up past someone in the club rating, or someone passed you.') },
    runningGames: { title: t('Games left running'), hint: t('A game of yours still running after three days, to finish or delete.') },
    deletion: { title: t('Deletion requests'), hint: t('Someone asks to delete a game you played, and how it ended.') },
    fairPlay: { title: t('Fair play'), hint: t('An admin deleted or repaired one of your games or trainings.') },
    weeklySummary: { title: t('Your week'), hint: t('A mail on Mondays: your games, average, trainings and badges of the week.') },
    clubBadges: { title: t('Club badges'), hint: t('Your club earned a badge.') },
    clubGoals: { title: t('Club goals'), hint: t('Your club reached a goal.') },
    joining: { title: t('Joining clubs'), hint: t('Your request to join a club was accepted or declined.') },
    joinRequests: { title: t('Requests to join'), hint: t('Someone asks to join your club, or joined it.') },
    fairPlayFound: { title: t('Fair play'), hint: t('A game or training in your club that cannot be real.') },
    goalEnding: { title: t('Goals ending'), hint: t('A goal of your club ends within a week, with how far it is.') },
    inviteUnused: { title: t('Unused invitations'), hint: t('Someone who got a login has not used it after a week.') },
    clubSummary: { title: t('The week of the club'), hint: t('A mail on Mondays: games, players, badges, goals and what waits for an admin.') },
    alertsCritical: { title: t('Critical alerts'), hint: t('E.g. a taken-over club or much deleted at once.') },
    alertsWarning: { title: t('Warnings'), hint: t('Unusual activity, e.g. many accounts or games at once.') },
    errors: { title: t('Errors of the app'), hint: t('Many errors within a day.') },
    usageReport: { title: t('Weekly usage report'), hint: t('A mail on Mondays: active users, logins, games, trainings and new accounts and clubs of the week, against the week before.') },
    security: { title: t('Security'), hint: t('Your password or email address was changed, or your account was blocked.') },
};
const MAILS = { off: t('No mail'), instant: t('At once'), daily: t('Once a day'), weekly: t('Once a week') };

/**
 * Which notifications the user gets, and how: in the notification center,
 * by mail at once, or collected in one mail a day or a week. Saved right away.
 */
const NotificationSettings = ({ onSaved, onError }) => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        NotificationService.loadSettings().then(setData).catch(() => setFailed(true));
    }, []);

    if (failed) return <p className="text-faint fs-7 m-0">{t('The notification settings could not be loaded.')}</p>;
    if (!data) return <Lines count={6} />;

    const change = (topic, changes) => {
        // shown at once, saved behind
        setData(current => ({ ...current, topics: current.topics.map(entry => entry.id === topic.id ? { ...entry, ...changes } : entry) }));
        NotificationService.saveSettings({ [topic.id]: { inApp: topic.inApp, mail: topic.mail, ...changes } })
            .then((saved) => { setData(saved); onSaved?.(TOPICS[topic.id]?.title ?? topic.id); })
            .catch((error) => onError?.(t('Not saved'), error));
    };
    const allMailsOff = () => {
        const choices = Object.fromEntries(data.topics.filter(topic => !topic.locked).map(topic => [topic.id, { inApp: topic.inApp, mail: 'off' }]));
        NotificationService.saveSettings(choices)
            .then((saved) => { setData(saved); onSaved?.(t('No mails')); })
            .catch((error) => onError?.(t('Not saved'), error));
    };

    return (
        <div className="notification-settings">
            <p className="text-faint fs-8 mt-0">
                {t('In the app: in your notifications (the bell). By mail: at once, or collected in one mail a day or a week (from 7 in the morning; the weekly one on Mondays). Saved right away.')}
            </p>
            {!data.mailEnabled &&
                <p className="notification-settings-note fs-8">{t('This installation sends no mails at the moment: the choices for mails apply once an admin sets them up.')}</p>}
            {data.groups.map(group => (
                <section key={group} className="notification-group" aria-labelledby={`notification-group-${group}`}>
                    <p id={`notification-group-${group}`} className="game-setup-section-title mb-1">{GROUPS[group]?.title}</p>
                    <p className="text-faint fs-8 mt-0 mb-2">{GROUPS[group]?.hint}</p>
                    <ul className="list-unstyled m-0 notification-topics">
                        {data.topics.filter(topic => topic.group === group).map(topic => (
                            <li key={topic.id} className="notification-topic">
                                <div className="notification-topic-text">
                                    <span className="text-default fw-semibold">{TOPICS[topic.id]?.title ?? topic.id}</span>
                                    <span className="text-faint fs-8">{TOPICS[topic.id]?.hint}</span>
                                </div>
                                <div className="notification-topic-controls">
                                    {!topic.mailOnly &&
                                        <label className="notification-topic-app" htmlFor={`notification-app-${topic.id}`}>
                                            <InputSwitch inputId={`notification-app-${topic.id}`} checked={topic.inApp} disabled={topic.locked} onChange={(event) => change(topic, { inApp: event.value })} />
                                            <span className="fs-8 text-subtle">{t('In the app')}</span>
                                        </label>}
                                    <Dropdown
                                        value={topic.mail}
                                        options={topic.mails.map(value => ({ value, label: MAILS[value] }))}
                                        onChange={(event) => change(topic, { mail: event.value })}
                                        disabled={topic.locked}
                                        className="notification-topic-mail"
                                        aria-label={t('{{topic}} by mail', { topic: TOPICS[topic.id]?.title ?? topic.id })}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            <div className="d-flex justify-content-end mt-3">
                <Button type="button" label={t('No mails at all')} icon="pi pi-envelope" size="small" severity="secondary" outlined onClick={allMailsOff} />
            </div>
        </div>
    );
};

export default NotificationSettings;
