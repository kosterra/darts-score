import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FaBell, FaScaleBalanced, FaWrench, FaRotateLeft, FaFlag, FaTrashCan, FaCheck } from 'react-icons/fa6';

import NotificationService, { announceNotificationsChange } from '../../services/notification.service';
import { useAuth } from '../../utils/auth.context';

dayjs.extend(relativeTime);

const ICONS = { fairPlayDeleted: FaScaleBalanced, fairPlayRepaired: FaWrench, fairPlayRestored: FaRotateLeft, deletionRequested: FaFlag, deletionDone: FaTrashCan, deletionKept: FaCheck };

/**
 * The notifications of the user, newest first; unread ones stand out until
 * they are opened or all are marked as read. limit: only the newest few, with
 * a link to all of them (on the profile).
 */
const NotificationList = ({ limit }) => {
    const navigate = useNavigate();
    const { clubs, activeClub, selectClub } = useAuth();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        NotificationService.loadNotifications().then(setData).catch(() => setFailed(true));
    }, []);

    if (failed) return <p className="text-faint fs-7 m-0">The notifications could not be loaded.</p>;
    if (!data) return <p className="text-faint fs-7 m-0">Loading…</p>;

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
    // a link of another club of the user switches to that club first
    const open = (notice) => {
        markRead(notice);
        if (!notice.link) return;
        if (notice.club && notice.club !== activeClub?.id && clubs.some(club => club.id === notice.club)) selectClub(notice.club);
        navigate(notice.link);
    };

    const shown = limit ? data.notifications.slice(0, limit) : data.notifications;

    return (
        <div className="notification-list">
            {data.unread > 0 &&
                <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                    <span className="text-subtle fs-7">{data.unread} unread</span>
                    <Button type="button" label="Mark all as read" icon="pi pi-check" size="small" severity="secondary" onClick={markAllRead} />
                </div>
            }
            {shown.length === 0
                ? <p className="text-faint fs-7 m-0 py-3 text-center">No notifications. You are told here when a player asks to delete a game you played, and when an admin deletes or repairs one of your games.</p>
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
                                            <span className="notification-meta" title={dayjs(notice.at).format('DD.MM.YYYY HH:mm')}>
                                                <i className="pi pi-clock" aria-hidden="true" />
                                                {dayjs(notice.at).fromNow()}{notice.byName && ` · ${notice.byName}`}
                                            </span>
                                        </div>
                                        {notice.body && <span className="text-subtle fs-7">{notice.body}</span>}
                                    </div>
                                    <div className="notification-actions">
                                        {notice.link && <Button type="button" label="Open" size="small" severity="secondary" onClick={() => open(notice)} />}
                                        {!notice.read && <Button type="button" icon="pi pi-check" size="small" text severity="secondary" onClick={() => markRead(notice)} aria-label="Mark as read" title="Mark as read" />}
                                        <Button type="button" icon="pi pi-times" size="small" text severity="secondary" onClick={() => remove(notice)} aria-label="Remove" title="Remove" />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            }
            {limit && data.notifications.length > limit &&
                <Link to="/notifications" className="text-subtle fs-8">All {data.notifications.length} notifications</Link>
            }
        </div>
    );
};

export default NotificationList;
