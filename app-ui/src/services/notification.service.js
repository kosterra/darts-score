import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/notifications';

// the newest notifications of the user: { notifications, unread }
const loadNotifications = () => requestJSON(API_URL);

// for the count next to the bell: { unread }
const loadUnread = () => requestJSON(`${API_URL}/unread`);

const markRead = (id) => requestJSON(`${API_URL}/${id}/read`, { method: 'PUT' });
const markAllRead = () => requestJSON(`${API_URL}/read`, { method: 'PUT' });
const remove = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });

// the count next to the bell follows what is read on the page
export const NOTIFICATIONS_CHANGED = 'darts-score:notifications-changed';
export const announceNotificationsChange = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

const NotificationService = { loadNotifications, loadUnread, markRead, markAllRead, remove };

export default NotificationService;
