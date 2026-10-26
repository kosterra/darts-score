import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Message } from 'primereact/message';

import AdminService from '../../services/admin.service';
import IntegrityService from '../../services/integrity.service';
import { useAuth } from '../../utils/auth.context';
import { formatNumber } from './installation.utils';
import { OverviewSkeleton } from '../elements/skeletons';
import { formatDateTime } from '../../utils/dates';
import { relativeTime } from '../../utils/relative.time';
import usePageTitle from '../../utils/use.page.title';
import { t, tn } from '../../utils/i18n';

// the dashboard follows on its own, every minute
const REFRESH_MS = 60 * 1000;

// a greeting by the time of day, as on the Dashboard of the players
const greeting = (name, hour = new Date().getHours()) => {
    if (hour < 5 || hour >= 22) return t('Good evening, {{name}}', { name });
    if (hour < 12) return t('Good morning, {{name}}', { name });
    if (hour < 18) return t('Hello, {{name}}', { name });
    return t('Good evening, {{name}}', { name });
};

/**
 * A figure with what it counts, and the page behind it. tone: 'good',
 * 'warn' or 'bad' colours it, for what wants attention; words instead of a
 * number (wordy) are set smaller.
 */
const Tile = ({ label, value, detail, to, tone, icon, wordy = false }) => {
    const body = (
        <>
            <span className="admin-tile-label">{icon && <i className={`pi ${icon}`} aria-hidden="true" />}{label}</span>
            <span className="admin-tile-value">{value}</span>
            {detail && <span className="admin-tile-detail">{detail}</span>}
        </>
    );
    const className = `admin-tile ${tone ? `is-${tone}` : ''} ${wordy ? 'is-wordy' : ''}`;
    return to ? <Link to={to} className={className}>{body}</Link> : <div className={className}>{body}</div>;
};

/**
 * What is wrong with the installation: each problem with what to do, a page
 * of the app or a setting of the server; else one line that all is well.
 */
const Health = ({ health }) => {
    if (!health) return null;
    if (!health.problems.length) {
        return (
            <p className="admin-health-ok">
                <i className="pi pi-check-circle" aria-hidden="true" />
                {t('All {{count}} checks of the installation passed: its settings, mail, two-step login, backups, disk and privacy page.', { count: health.checked })}
            </p>
        );
    }
    return (
        <section className="admin-dashboard-group" aria-labelledby="admin-health">
            <h2 id="admin-health" className="game-setup-section-title">{t('To fix')}</h2>
            <ul className="admin-health list-unstyled m-0">
                {health.problems.map(problem => (
                    <li key={problem.id} className={`admin-health-item is-${problem.level}`}>
                        <i className={`pi ${problem.level === 'bad' ? 'pi-times-circle' : 'pi-exclamation-triangle'}`} aria-hidden="true" />
                        <span className="d-flex flex-column gap-1 min-w-0">
                            <span className="text-default fw-semibold">{problem.title}</span>
                            <span className="text-subtle fs-7">{problem.detail}</span>
                            {problem.fix?.to && <Link to={problem.fix.to} className="fs-7 align-self-start">{t('Go there')}</Link>}
                            {problem.fix?.env && <span className="text-faint fs-8">{t('A setting of the server (the environment of the stack):')}{' '}<code>{problem.fix.env}</code></span>}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

/**
 * What a global admin sees first: the installation in numbers, who uses it
 * now and this week, what wants attention (alerts, errors, fair play), the
 * mails of today against the limit, and the backups. Every figure leads to
 * its page.
 */
const AdminDashboardPage = () => {
    const { user } = useAuth();
    usePageTitle(t('Administration'));
    const [data, setData] = useState(null);
    const [fairPlay, setFairPlay] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        AdminService.loadDashboard().then(loaded => { setData(loaded); setError(''); }).catch(err => setError(err.message));
        IntegrityService.loadSummary(true).then(setFairPlay).catch(() => setFairPlay(null));
    }, []);
    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    if (error && !data) return <div className="container-fluid p-4"><Message severity="error" text={error} /></div>;
    if (!data) return <OverviewSkeleton />;

    const { numbers, now, week, attention, mail, backups } = data;
    const backupAge = backups.latest ? (Date.now() - new Date(backups.latest.createdAt).getTime()) / 864e5 : null;
    const backupTone = backups.lastError ? 'bad' : backupAge === null || backupAge > 8 ? 'warn' : 'good';
    const mailShare = mail.limit ? mail.today / mail.limit : 0;

    return (
        <div className="container-fluid p-4 border-0 admin-dashboard">
            <header className="dashboard-header hero-header rounded-2 p-4 mb-4 d-flex flex-column gap-1">
                <h1 className="fs-2 fw-semibold text-default m-0 text-break">{greeting(user?.firstname ?? '')}</h1>
                <span className="text-subtle">{t('The installation at a glance. Every figure leads to its page.')}</span>
            </header>

            <Health health={data.health} />

            <section className="admin-dashboard-group" aria-labelledby="admin-needs">
                <h2 id="admin-needs" className="game-setup-section-title">{t('Needs you')}</h2>
                <div className="admin-tiles">
                    <Tile icon="pi-bell" label={t('Open alerts')} value={formatNumber(attention.critical + attention.warning)} to="/admin/alerts"
                        tone={attention.critical ? 'bad' : attention.warning ? 'warn' : 'good'}
                        detail={attention.critical ? tn(attention.critical, '{{count}} critical', '{{count}} critical') : attention.warning ? tn(attention.warning, '{{count}} warning', '{{count}} warnings') : t('Nothing open')} />
                    <Tile icon="pi-exclamation-triangle" label={t('Errors in the last 24 hours')} value={formatNumber(attention.errors)} to="/admin/logs" tone={attention.errors > 20 ? 'bad' : attention.errors ? 'warn' : 'good'} />
                    <Tile icon="pi-shield" label={t('Fair play')} value={fairPlay ? formatNumber(fairPlay.open ?? 0) : '–'} to="/admin/fair-play"
                        tone={fairPlay?.impossible ? 'bad' : fairPlay?.open ? 'warn' : 'good'} detail={t('games and trainings to look at')} />
                    <Tile icon="pi-database" label={t('Last backup')} to="/admin/backups" tone={backupTone} wordy
                        value={backups.latest ? relativeTime(backups.latest.createdAt) : t('None yet')}
                        detail={backups.lastError
                            ? t('The last automatic backup failed.')
                            : backups.enabled ? t('Next {{date}}', { date: formatDateTime(backups.nextAt) }) : t('No automatic backups')} />
                </div>
            </section>

            <section className="admin-dashboard-group" aria-labelledby="admin-use">
                <h2 id="admin-use" className="game-setup-section-title">{t('Who uses it')}</h2>
                <div className="admin-tiles">
                    <Tile icon="pi-circle-fill" label={t('Logged in now')} value={formatNumber(now.users)} to="/admin/sessions" detail={tn(now.sessions, '{{count}} session', '{{count}} sessions')} />
                    <Tile icon="pi-calendar" label={t('Active this week')} value={formatNumber(week.users)} to="/admin/usage" detail={t('accounts that used the app')} />
                    <Tile icon="pi-user-plus" label={t('Accounts')} value={formatNumber(numbers.users)} to="/admin/users" detail={tn(numbers.usersNew, '{{count}} new this week', '{{count}} new this week')} />
                    <Tile icon="pi-envelope" label={t('Mails today')} to="/system-settings"
                        value={mail.configured ? formatNumber(mail.today) : '–'}
                        tone={!mail.configured ? 'warn' : mailShare >= 1 ? 'bad' : mailShare >= 0.8 ? 'warn' : undefined}
                        detail={!mail.configured ? t('Mail is not set up') : mail.limit ? t('of {{limit}} a day', { limit: formatNumber(mail.limit) }) : t('no daily limit')} />
                </div>
            </section>

            <section className="admin-dashboard-group" aria-labelledby="admin-numbers">
                <h2 id="admin-numbers" className="game-setup-section-title">{t('The installation')}</h2>
                <div className="admin-tiles">
                    <Tile icon="pi-sitemap" label={t('Clubs')} value={formatNumber(numbers.clubs)} to="/admin/clubs" />
                    <Tile icon="pi-users" label={t('Players')} value={formatNumber(numbers.players)} to="/admin/players" />
                    <Tile icon="pi-trophy" label={t('Games played')} value={formatNumber(numbers.gamesPlayed)} to="/admin/games" detail={tn(numbers.gamesThisWeek, '{{count}} this week', '{{count}} this week')} />
                    <Tile icon="pi-bolt" label={t('Quick games')} value={formatNumber(numbers.quickGames)} to="/admin/quick-games" detail={t('in the last 7 days')} />
                </div>
            </section>
        </div>
    );
};

export default AdminDashboardPage;
