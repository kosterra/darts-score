import { translateAnswer } from '../utils/i18n';
import { getHeaders, requestJSON } from '../utils/service.utils';

const API_URL = '/api/admin';

/**
 * Everything a global admin looks after: totals, all clubs and the state of the installation.
 */
const loadOverview = () => requestJSON(`${API_URL}/overview`);

// every club, for the club filter of the admin lists
const loadClubs = () => requestJSON(`${API_URL}/clubs`);

// the whole installation at a glance, above the lists of players, games and trainings
const loadPlayersInsights = () => requestJSON(`${API_URL}/insights/players`);
const loadGamesInsights = () => requestJSON(`${API_URL}/insights/games`);
const loadTrainingsInsights = () => requestJSON(`${API_URL}/insights/trainings`);

// players, games and trainings of the given clubs, each with its club
const query = (clubIds) => `?clubs=${clubIds.map(encodeURIComponent).join(',')}`;
const loadPlayers = (clubIds) => requestJSON(`${API_URL}/players${query(clubIds)}`);
const loadGames = (clubIds) => requestJSON(`${API_URL}/games${query(clubIds)}`);
const loadTrainings = (clubIds) => requestJSON(`${API_URL}/trainings${query(clubIds)}`);
// the X01 trainings against the bot of the chosen clubs
const loadX01Trainings = (clubIds) => requestJSON(`${API_URL}/x01-trainings${query(clubIds)}`);
// Bob's 27, 121 Checkout, … of the rules engine
const loadRulesTrainings = (clubIds) => requestJSON(`${API_URL}/rules-trainings${query(clubIds)}`);

// the quick games of the public start page: { total, perDay, games }, and deleting some
const loadQuickGames = () => requestJSON(`${API_URL}/quick-games`);
const deleteQuickGames = (ids) => requestJSON(`${API_URL}/quick-games`, { method: 'DELETE', body: { ids } });
// a quick game and its statistics, without its key
const loadQuickGame = (id) => requestJSON(`${API_URL}/quick-games/${id}`);
const loadQuickGameStats = (id) => requestJSON(`${API_URL}/quick-games/${id}/stats`);
// the darts evenings without an account
const loadEvenings = () => requestJSON(`${API_URL}/evenings`);
const deleteEvenings = (ids) => requestJSON(`${API_URL}/evenings`, { method: 'DELETE', body: { ids } });
// a club as its admins have it, to look at it
const visitClub = (id) => requestJSON(`${API_URL}/clubs/${id}/visit`);

// a player's clubs, and deleting a player from every club
const addPlayerToClub = (playerId, clubId) => requestJSON(`${API_URL}/players/${playerId}/clubs`, { method: 'POST', body: { club: clubId } });
const removePlayerFromClub = (playerId, clubId) => requestJSON(`${API_URL}/players/${playerId}/clubs/${clubId}`, { method: 'DELETE' });
const deletePlayer = (playerId) => requestJSON(`${API_URL}/players/${playerId}`, { method: 'DELETE' });

// the banner on top of every page, as global admins edit it
const loadBannerSettings = () => requestJSON(`${API_URL}/banner`);
const saveBanner = (banner) => requestJSON(`${API_URL}/banner`, { method: 'PUT', body: banner });

// how long a login lasts: { timeoutHours, limits: { min, max, default } }
// the mails of the app: their texts, a preview from a draft, a test mail to oneself
// the mails in one language: every user gets them in their own
const loadMailTemplates = (language = 'en') => requestJSON(`${API_URL}/mail-templates?language=${language}`);
const saveMailTemplate = (id, draft, language = 'en') => requestJSON(`${API_URL}/mail-templates/${id}?language=${language}`, { method: 'PUT', body: draft });
const resetMailTemplate = (id, language = 'en') => requestJSON(`${API_URL}/mail-templates/${id}?language=${language}`, { method: 'DELETE' });
const previewMailTemplate = (id, draft, language = 'en') => requestJSON(`${API_URL}/mail-templates/${id}/preview?language=${language}`, { method: 'POST', body: draft });
const testMailTemplate = (id, draft, language = 'en') => requestJSON(`${API_URL}/mail-templates/${id}/test?language=${language}`, { method: 'POST', body: draft });

// the mail server: how it is set up, and a test mail to any address ({ sentTo, response, ms })
const loadMailServer = () => requestJSON(`${API_URL}/mail-server`);
const sendTestMail = (to, language = 'en') => requestJSON(`${API_URL}/mail-server/test`, { method: 'POST', body: { to, language } });
// the daily limit of the mail server: { perDay } (null for none)
const saveMailLimit = (perDay) => requestJSON(`${API_URL}/mail-server/limit`, { method: 'PUT', body: { perDay } });

// who is logged in now, ending sessions, and the use of the app per week
const loadSessions = () => requestJSON(`${API_URL}/sessions`);
const endSession = (id) => requestJSON(`${API_URL}/sessions/${id}`, { method: 'DELETE' });
const endSessionsOf = (userId) => requestJSON(`${API_URL}/sessions/users/${userId}`, { method: 'DELETE' });
const loadUsage = (weeks = 12) => requestJSON(`${API_URL}/usage?weeks=${weeks}`);

// what the public start page shows: { showNumbers }
const loadStartPageSettings = () => requestJSON(`${API_URL}/start-page`);
const saveStartPageSettings = (settings) => requestJSON(`${API_URL}/start-page`, { method: 'PUT', body: settings });

// the ways to support this installation with a gift: { url, twint, project }
const loadSupportSettings = () => requestJSON(`${API_URL}/support`);
const saveSupportSettings = (settings) => requestJSON(`${API_URL}/support`, { method: 'PUT', body: settings });

// who runs the installation, for the privacy policy and the imprint
const loadLegalSettings = () => requestJSON(`${API_URL}/legal`);
const saveLegalSettings = (settings) => requestJSON(`${API_URL}/legal`, { method: 'PUT', body: settings });

const loadSessionSettings = () => requestJSON(`${API_URL}/session`);
const saveSessionSettings = (timeoutHours) => requestJSON(`${API_URL}/session`, { method: 'PUT', body: { timeoutHours } });

// two-step login: { policy, graceDays, requiredSince, policies, graceLimits, ownEnabled }
const loadMfaSettings = () => requestJSON(`${API_URL}/mfa`);
const saveMfaSettings = (settings) => requestJSON(`${API_URL}/mfa`, { method: 'PUT', body: settings });

// warnings and errors of the API
const loadLogs = ({ level = 'all', search = '' } = {}) =>
    requestJSON(`${API_URL}/logs?level=${encodeURIComponent(level)}&search=${encodeURIComponent(search)}`);
const clearLogs = () => requestJSON(`${API_URL}/logs`, { method: 'DELETE' });

// spam alerts, the rules behind them and what is blocked
const loadAlerts = (status = 'open') => requestJSON(`${API_URL}/alerts?status=${encodeURIComponent(status)}`);
const loadAlertSummary = () => requestJSON(`${API_URL}/alerts/summary`);
const loadAlertRules = () => requestJSON(`${API_URL}/alerts/rules`);
const resolveAlert = (id) => requestJSON(`${API_URL}/alerts/${id}/resolve`, { method: 'PUT' });
const reopenAlert = (id) => requestJSON(`${API_URL}/alerts/${id}/reopen`, { method: 'PUT' });
const resolveAllAlerts = () => requestJSON(`${API_URL}/alerts/resolve-all`, { method: 'PUT' });
const loadBlocks = () => requestJSON(`${API_URL}/blocks`);
const blockUser = (id, reason) => requestJSON(`${API_URL}/blocks/users/${id}`, { method: 'PUT', body: { reason } });
const unblockUser = (id) => requestJSON(`${API_URL}/blocks/users/${id}`, { method: 'DELETE' });
const blockIp = (ip, reason, hours) => requestJSON(`${API_URL}/blocks/ips`, { method: 'POST', body: { ip, reason, hours } });
const unblockIp = (id) => requestJSON(`${API_URL}/blocks/ips/${id}`, { method: 'DELETE' });

// what the global admins see first: the installation, now, this week, what needs them, mail and backups
const loadDashboard = () => requestJSON(`${API_URL}/dashboard`);

// the backups on the server and their schedule: { backups, schedule, busy }
const loadBackups = () => requestJSON(`${API_URL}/backups`);
const createBackup = () => requestJSON(`${API_URL}/backups`, { method: 'POST' });
const deleteBackup = (name) => requestJSON(`${API_URL}/backups/${encodeURIComponent(name)}`, { method: 'DELETE' });
const restoreBackup = (name) => requestJSON(`${API_URL}/backups/${encodeURIComponent(name)}/restore`, { method: 'POST', body: { confirm: 'RESTORE' } });
const saveBackupSchedule = (schedule) => requestJSON(`${API_URL}/backups/schedule`, { method: 'PUT', body: schedule });
// where the file of a backup is downloaded (the login goes along as its cookie)
const backupUrl = (name) => `${API_URL}/backups/${encodeURIComponent(name)}`;
// a backup file from elsewhere, kept next to the others to restore from
const uploadBackup = async (file) => {
    const formData = new FormData();
    formData.append('backup', file);
    const response = await fetch(`${API_URL}/backups/upload`, { method: 'POST', headers: getHeaders(false), body: formData });
    const data = translateAnswer(await response.json().catch(() => ({})));
    if (!response.ok) throw new Error(data.errors?.join(' ') || data.message || response.statusText);
    return data;
};

const AdminService = {
    loadDashboard,
    loadBackups,
    createBackup,
    deleteBackup,
    restoreBackup,
    saveBackupSchedule,
    backupUrl,
    uploadBackup,
    loadQuickGames,
    deleteQuickGames,
    loadQuickGame,
    loadQuickGameStats,
    loadEvenings,
    deleteEvenings,
    visitClub,
    loadLogs,
    clearLogs,
    loadAlerts,
    loadAlertSummary,
    loadAlertRules,
    resolveAlert,
    reopenAlert,
    resolveAllAlerts,
    loadBlocks,
    blockUser,
    unblockUser,
    blockIp,
    unblockIp,
    loadBannerSettings,
    saveBanner,
    loadSessionSettings,
    loadStartPageSettings,
    loadMailTemplates,
    saveMailTemplate,
    resetMailTemplate,
    previewMailTemplate,
    testMailTemplate,
    loadMailServer,
    loadSessions,
    endSession,
    endSessionsOf,
    loadUsage,
    sendTestMail,
    saveMailLimit,
    saveStartPageSettings,
    saveSessionSettings,
    loadMfaSettings,
    loadLegalSettings,
    loadSupportSettings,
    saveSupportSettings,
    saveLegalSettings,
    saveMfaSettings,
    loadOverview,
    loadPlayersInsights,
    loadGamesInsights,
    loadTrainingsInsights,
    loadClubs,
    loadPlayers,
    loadGames,
    loadTrainings,
    loadX01Trainings,
    loadRulesTrainings,
    addPlayerToClub,
    removePlayerFromClub,
    deletePlayer,
};

export default AdminService;
