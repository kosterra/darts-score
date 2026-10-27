import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FaListOl, FaCalendarXmark,
    FaBell, FaScaleBalanced, FaWrench, FaRotateLeft, FaFlag, FaTrashCan, FaCheck, FaUserPlus, FaUserCheck, FaUserXmark, FaUserShield, FaShieldHalved, FaFlagCheckered,
    FaMedal, FaArrowTrendUp, FaTrophy, FaStar, FaFaceGrimace, FaSoap, FaRankingStar, FaHourglassHalf, FaClock, FaEnvelope, FaTriangleExclamation, FaCircleExclamation, FaBug, FaKey, FaAt, FaLock, FaSitemap,
} from 'react-icons/fa6';

import NotificationService, { announceNotificationsChange } from '../../services/notification.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';
import DeletePopup from '../elements/delete.popup';
import { formatDate } from '../../utils/dates';

dayjs.extend(relativeTime);

const ICONS = { fairPlayDeleted: FaScaleBalanced, fairPlayRepaired: FaWrench, fairPlayRestored: FaRotateLeft, deletionRequested: FaFlag, deletionDone: FaTrashCan, deletionKept: FaCheck, joinRequested: FaUserPlus, clubJoined: FaUserPlus, joinAccepted: FaUserCheck, joinDeclined: FaUserXmark, clubHandedOver: FaUserShield, clubBadge: FaShieldHalved, clubGoal: FaFlagCheckered,
    badgeEarned: FaMedal, levelUp: FaArrowTrendUp, recordBeaten: FaTrophy, personalBest: FaStar, shameGot: FaFaceGrimace, shameWashed: FaSoap,
    ratingPassed: FaRankingStar, ratingPassedBy: FaRankingStar, gameRunning: FaHourglassHalf, fairPlayFound: FaScaleBalanced, goalEnding: FaClock,
    inviteUnused: FaEnvelope, alertCritical: FaTriangleExclamation, alertWarning: FaCircleExclamation, errorSpike: FaBug, mailLimitNear: FaEnvelope, mailLimitReached: FaEnvelope, tournamentInvite: FaSitemap, tournamentReminder: FaSitemap, tournamentCancelled: FaSitemap, tournamentDrawn: FaSitemap, tournamentMatch: FaSitemap, tournamentWon: FaTrophy, tournamentClosed: FaSitemap, tournamentOverdue: FaSitemap, leagueStarted: FaListOl, leagueMatch: FaListOl, leagueMoved: FaListOl, leagueWon: FaTrophy, leagueOverdue: FaListOl, clubNightCancelled: FaCalendarXmark,
    passwordChanged: FaKey, emailChanged: FaAt, accountBlocked: FaLock };

/**
 * The notifications of the user, newest first; unread ones stand out until
 * they are opened or all are marked as read. limit: only the newest few, with
 * a link to all of them (on the profile).
 */
const NotificationList = ({ limit }) => {
    const navigate = useNavigate();
    const { clubs, activeClub, selectClub, refreshClubs } = useAuth();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        NotificationService.loadNotifications().then(setData).catch(() => setFailed(true));
    }, []);

    if (failed) return <p className="text-faint fs-7 m-0">{t('The notifications could not be loaded.')}</p>;
    if (!data) return <Lines count={3} />;

    const update = (changes) => {
        setData(current => changes(current));
        announceNotificationsChange();
    };
    const markRead = (notice) => {
        if (notice.read) return;
        NotificationService.markRead(notice.id).catch(() => {});
        update(current => ({
            notifications: current.notifications.map(item => item.id === notice.id ? { ...item, read: true } : item),
            unread: Math.max(0, current.unread - 1),
        }));
    };
    const markAllRead = () => {
        NotificationService.markAllRead().catch(() => {});
        update(current => ({ notifications: current.notifications.map(item => ({ ...item, read: true })), unread: 0 }));
    };
    const remove = (notice) => {
        NotificationService.remove(notice.id).catch(() => {});
        update(current => ({
            notifications: current.notifications.filter(item => item.id !== notice.id),
            unread: Math.max(0, current.unread - (notice.read ? 0 : 1)),
        }));
    };
    const removeAll = () => {
        NotificationService.removeAll().catch(() => {});
        update(() => ({ notifications: [], unread: 0 }));
    };
    // a link of another club of the user switches to that club first; one just
    // joined is not among the user's clubs yet, until they are loaded again
    const open = async (notice) => {
        markRead(notice);
        if (!notice.link) return;
        if (notice.club && notice.club !== activeClub?.id) {
            const known = clubs.some(club => club.id === notice.club)
                || (await refreshClubs().catch(() => [])).some(club => club.id === notice.club);
            if (known) selectClub(notice.club);
        }
        navigate(notice.link);
    };

    const shown = limit ? data.notifications.slice(0, limit) : data.notifications;

    return (
        <div className="notification-list">
            {/* clearing the whole list only where all of it is shown */}
            {(data.unread > 0 || (!limit && data.notifications.length > 0)) &&
                <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                    <span className="text-subtle fs-7">{data.unread > 0 && <>{data.unread}{' '}{t('unread')}</>}</span>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {data.unread > 0 && <Button type="button" label={t('Mark all as read')} icon="pi pi-check" size="small" severity="secondary" onClick={markAllRead} />}
                        {!limit && data.notifications.length > 0 &&
                            <DeletePopup
                                header={t('Clear all notifications')}
                                message={t('all {{count}} notifications', { count: data.notifications.length })}
                                handleDelete={removeAll}
                                label={t('Clear all')}
                                size="small"
                            />
                        }
                    </div>
                </div>
            }
            {shown.length === 0
                ? <p className="text-faint fs-7 m-0 py-3 text-center">{t('No notifications. You are told here when a player asks to delete a game you played, when an admin deletes or repairs one of your games, and how your requests to join a club were answered.')}</p>
                : (
                    <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                        {shown.map(notice => {
                            const Icon = ICONS[notice.kind] ?? FaBell;
                            return (
                                <li key={notice.id} className={`notification ${notice.read ? '' : 'is-unread'}`}>
                                    <span className="notification-icon" aria-hidden="true"><Icon /></span>
                                    <div className="notification-text">
                                        {/* like the other lists: the title with when and who beside it, the message below */}
                                        <div className="notification-head">
                                            <span className="text-default fw-semibold">{notice.title}</span>
                                            <span className="notification-meta" title={formatDate(notice.at, { time: true })}>
                                                <i className="pi pi-clock" aria-hidden="true" />
                                                {dayjs(notice.at).fromNow()}{notice.byName && ` · ${notice.byName}`}
                                            </span>
                                        </div>
                                        {notice.body && <span className="text-subtle fs-7">{notice.body}</span>}
                                    </div>
                                    <div className="notification-actions">
                                        {notice.link && <Button type="button" label={t('Open')} size="small" severity="secondary" onClick={() => open(notice)} />}
                                        {!notice.read && <Button type="button" icon="pi pi-check" size="small" text severity="secondary" onClick={() => markRead(notice)} aria-label={t('Mark as read')} title={t('Mark as read')} />}
                                        <Button type="button" icon="pi pi-times" size="small" text severity="secondary" onClick={() => remove(notice)} aria-label={t('Remove')} title={t('Remove')} />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            }
            {limit && data.notifications.length > limit &&
                <Link to="/notifications" className="text-subtle fs-8">{t('All {{count}} notifications', { count: data.notifications.length })}</Link>
            }
        </div>
    );
};

export default NotificationList;
