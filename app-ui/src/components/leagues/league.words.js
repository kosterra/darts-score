import { t } from '../../utils/i18n';

// where a league stands, as a tag
export const LEAGUE_STATUS_WORDS = {
    draft: { label: t('Draft'), severity: 'secondary' },
    // as the status of a game: running orange, finished blue
    running: { label: t('Running'), severity: 'warning' },
    finished: { label: t('Finished'), severity: 'info' },
    cancelled: { label: t('Cancelled'), severity: 'danger' },
};

// the nickname of a player of a league
export const leagueName = (league, playerId) => league.names?.[playerId]?.nickname ?? '?';

// the league as the match cards of the tournaments read it (players by id, the player asking)
export const asTournament = (league) => ({ players: league.names ?? {}, entries: [], myPlayer: league.myPlayer, matches: league.matches ?? [] });
