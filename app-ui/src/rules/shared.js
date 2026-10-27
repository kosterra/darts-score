// The rule files the API keeps an identical copy of (in app-api/src/rules),
// to work out the games from their stored visits as the app does.
// After changing one of them: npm run copy-rules (which also gives the API
// the translations of its own texts, for the mails: see locales/server.texts.js)
export const SHARED_RULES = ['engine.js', 'darts.js', 'x01.js', 'cricket.js', 'elimination.js', 'clock.js', 'stored.js', 'club.rules.js', 'games.js', 'trainings.js', 'notifications.js', 'tournaments.js', 'leagues.js', 'calendar.js'];
