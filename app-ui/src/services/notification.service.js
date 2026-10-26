import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/notifications';

// the newest notifications of the user: { notifications, unread }
const loadNotifications = () => requestJSON(API_URL);

// for the count next to the bell: { unread }
const loadUnread = () => requestJSON(`${API_URL}/unread`);

const markRead = (id) => requestJSON(`${API_URL}/${id}/read`, { method: 'PUT' });
const markAllRead = () => requestJSON(`${API_URL}/read`, { method: 'PUT' });
const remove = (id) => requestJSON(`${API_URL}/${id}`, { method: 'DELETE' });
// clears the list: { deleted }
const removeAll = () => requestJSON(API_URL, { method: 'DELETE' });

// which notifications the user gets, and how: { mailEnabled, groups, topics }
const loadSettings = () => requestJSON(`${API_URL}/settings`);
const saveSettings = (choices) => requestJSON(`${API_URL}/settings`, { method: 'PUT', body: choices });

// the unsubscribe links of the mails (no login needed)
const unsubscribeInfo = (token) => requestJSON(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
const unsubscribe = (token) => requestJSON(`/api/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' });

// the count next to the bell follows what is read on the page
export const NOTIFICATIONS_CHANGED = 'darts-score:notifications-changed';
export const announceNotificationsChange = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

const NotificationService = { loadNotifications, loadUnread, markRead, markAllRead, remove, removeAll, loadSettings, saveSettings, unsubscribeInfo, unsubscribe };

export default NotificationService;
