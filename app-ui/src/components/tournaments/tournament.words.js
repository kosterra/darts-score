import { t } from '../../utils/i18n';

// the name of a round by how many players are left in it
export const roundName = (size) => ({ 0: t('Group stage'), 2: t('Final'), 4: t('Semi-finals'), 8: t('Quarter-finals') })[size] ?? t('Last {{count}}', { count: size });

// "Group A", "Group B", … of a tournament with groups
export const groupName = (group) => t('Group {{letter}}', { letter: String.fromCharCode(65 + group) });

// the rules of a round in words: "Best of 5 legs", "First to 3 sets (Best of 5 legs)"
export const rulesText = (rules) => {
    if (!rules) return '';
    const legs = rules.legMode === 'First to' ? t('First to {{count}} legs', { count: rules.numberOfLegs }) : t('Best of {{count}} legs', { count: rules.numberOfLegs });
    const text = rules.numberOfSets > 1
        ? `${rules.setMode === 'First to' ? t('First to {{count}} sets', { count: rules.numberOfSets }) : t('Best of {{count}} sets', { count: rules.numberOfSets })} (${legs})`
        : legs;
    const special = rules.startingScore !== 501 || rules.legInMode !== 'Straight In' || rules.legOutMode !== 'Double Out';
    return special ? `${rules.startingScore} ${t(rules.legInMode)} / ${t(rules.legOutMode)}, ${text}` : text;
};

// the presets with their names and what they are
export const PRESET_WORDS = {
    clubNight: { label: t('Club night'), hint: t('Short: best of 3 legs, the semi-finals best of 5, the final best of 7.') },
    clubClassic: { label: t('Club classic'), hint: t('Best of 5 legs, then 7, 9 and 11 in the final.') },
    miniWorld: { label: t('Mini World Championship'), hint: t('In sets of best of 5 legs: best of 3 sets, the final best of 5.') },
    playersChampionship: { label: t('Players Championship'), hint: t('PDC floor event: best of 11 legs in every round.') },
    europeanTour: { label: t('European Tour'), hint: t('PDC: best of 11 legs, the semi-finals 13, the final 15.') },
    worldMatchplay: { label: t('World Matchplay'), hint: t('PDC, legs only: first to 10, 11, 16, 17 and 18 in the final.') },
    worldChampionship: { label: t('World Championship'), hint: t('PDC, in sets of best of 5 legs: first to 3 sets up to first to 7 in the final.') },
};

// how the members hear of the registration: the choice, what it does, and what opening it says
export const INVITE_WORDS = {
    mail: {
        label: t('By mail'),
        hint: t('Every member gets a notification in the app and a mail with the links to enter or decline (as each chose under Notifications); players without a login too, when the club keeps their address. A reminder comes a day before the end.'),
        opening: t('Every member of the club is invited, in the app and by mail.'),
    },
    notification: {
        label: t('Notification only'),
        hint: t('Every member gets a notification in the app, no mail. Players without a login only hear of it from you.'),
        opening: t('Every member of the club is invited with a notification in the app.'),
    },
    banner: {
        label: t('Banner only'),
        hint: t('Nobody is told: the members see the tournament on top of the club\'s dashboard and enter there.'),
        opening: t('The tournament shows on top of the club\'s dashboard; nobody is told otherwise.'),
    },
};

// what a tournament is doing, as a label with its colour
export const STATUS_WORDS = {
    draft: { label: t('Draft'), severity: 'secondary' },
    registration: { label: t('Registration open'), severity: 'success' },
    closed: { label: t('Registration closed'), severity: 'secondary' },
    drawn: { label: t('Drawn'), severity: 'secondary' },
    // as the status of a game: running orange, finished blue
    running: { label: t('Running'), severity: 'warning' },
    finished: { label: t('Finished'), severity: 'info' },
    cancelled: { label: t('Cancelled'), severity: 'danger' },
};

// the name of a player of a tournament
export const nameOf = (tournament, playerId) => tournament.players?.[playerId]?.nickname ?? '?';
