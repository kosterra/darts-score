import { requestJSON } from '../utils/service.utils';

const API_URL = '/api/calendar';

// the club's calendar from one day to another ("YYYY-MM-DD"): { nights, clubNights, events, myPlayer }
const loadCalendar = (from, to) => requestJSON(`${API_URL}?${new URLSearchParams({ from, to })}`);
// the weekly club nights (club admins): [{ weekday, start, end, note }]
const saveNights = (nights) => requestJSON(`${API_URL}/nights`, { method: 'PUT', body: { nights } });
// coming to a club night or not ('yes', 'no'; null takes the answer back)
const answer = (day, value) => requestJSON(`${API_URL}/nights/${day}/attendance`, { method: 'PUT', body: { answer: value } });
const cancelNight = (day, reason) => requestJSON(`${API_URL}/nights/${day}/cancelled`, { method: 'PUT', body: { reason } });
const restoreNight = (day) => requestJSON(`${API_URL}/nights/${day}/cancelled`, { method: 'DELETE' });
// the address of the own calendar feed: { url }; renewed, the old one stops working
const feedLink = () => requestJSON(`${API_URL}/feed-link`);
const renewFeedLink = () => requestJSON(`${API_URL}/feed-link`, { method: 'POST' });

const CalendarService = { loadCalendar, saveNights, answer, cancelNight, restoreNight, feedLink, renewFeedLink };

export default CalendarService;
