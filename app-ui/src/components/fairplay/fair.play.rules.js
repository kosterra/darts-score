import { t } from '../../utils/i18n';

const percent = (share) => `${Math.round(share * 100)} %`;

/**
 * What the fair play checks look for, worst first, with the limits of the
 * API (app-api/src/utils/integrity.js, sent along with the findings).
 */
export const fairPlayRules = (limits) => [
    { id: 'tooManyDarts', level: 'impossible', title: t('More than three darts in a visit'), description: t('A visit has three darts at most.') },
    { id: 'invalidDart', level: 'impossible', title: t('A dart that is not on the board'), description: t('Every dart is a single, double or treble of 1 to 20, the bull, the outer bull or a miss.') },
    { id: 'scoreMismatch', level: 'impossible', title: t('The score does not match the darts'), description: t('The score entered for a visit or a training is not what its darts give.') },
    { id: 'wrongFinish', level: 'impossible', title: t('Checked out without a {{value}}', { value: t('double') }), description: t('A leg finished on a dart the out mode does not allow (Double Out, Master Out).') },
    { id: 'tooFewDarts', level: 'impossible', title: t('A leg won with too few darts'), description: t('Fewer darts than the starting score needs (at 60 per dart, e.g. nine for 501), or Around the Clock with fewer than 21 darts.') },
    { id: 'dartsMismatch', level: 'impossible', title: t('The darts per target do not add up'), description: t('In Around the Clock, the darts per target are not the darts entered.') },
    { id: 'resultMismatch', level: 'impossible', title: t('The result is not what the darts give'), description: t('The newer games are played through again from their darts: the stored win or score is a different one.') },
    { id: 'tooFast', level: 'impossible', title: t('Faster than darts can be thrown'), description: t('Around the Clock in under {{seconds}} seconds, or a training of {{darts}} darts and more with under {{perDart}} seconds per dart.', { seconds: limits.atcImpossibleTime / 100, darts: limits.trainingFastDarts, perDart: limits.trainingImpossibleSecondsPerDart }) },
    { id: 'leftMismatch', level: 'error', title: t('A score left that does not add up'), description: t('In X01, the score left after a visit is not the one before less the darts, often after an undo. It can be repaired from the darts.') },
    { id: 'unreadable', level: 'error', title: t('The darts cannot be played through'), description: t('The game\'s darts do not fit its rules') },
    { id: 'highAverage', level: 'suspicious', title: t('A professional average'), description: t('X01 with a 3-dart average of {{average}} or more, Elimination with {{points}} points per visit, each over {{rounds}} visits at least.', { average: limits.x01HighAverage, points: limits.eliminationHighVisit, rounds: limits.minRounds }) },
    { id: 'aboveUsual', level: 'suspicious', title: t('Far above the usual level'), description: t('An X01 average {{points}} points above the player\'s usual one (from {{games}} games and more).', { points: limits.x01AboveUsual, games: limits.usualGames }) },
    { id: 'highMarks', level: 'suspicious', title: t('Professional marks per round'), description: t('Cricket with {{marks}} marks per round and more.', { marks: limits.cricketHighMarks }) },
    { id: 'nineDarter', level: 'suspicious', title: t('A nine-darter'), description: t('The perfect leg: possible, but worth a look.') },
    { id: 'proPlay', level: 'suspicious', title: t('The play of a professional'), description: t('Far out of reach for a club player, e.g. Shanghai with {{shanghai}} hits, Golf with {{golf}} strokes per hole, Bob\'s 27 above {{bobs}}, a scoring training above {{scoring}}.', { shanghai: percent(limits.shanghaiHitRate), golf: limits.golfStrokesPerHole, bobs: limits.bobs27High, scoring: limits.scoringHighAverage }) },
    { id: 'perfectRound', level: 'suspicious', title: t('Every dart a hit'), description: t('Around the Clock on doubles or trebles without a miss, or with {{darts}} darts or fewer.', { darts: limits.atcHardRingDarts }) },
    { id: 'worldClassTime', level: 'suspicious', title: t('A world-class time'), description: t('Around the Clock in under {{seconds}} seconds.', { seconds: limits.atcSuspiciousTime / 100 }) },
    { id: 'fastEntry', level: 'suspicious', title: t('Played very fast'), description: t('A game with under {{seconds}} seconds per visit, or a training with under {{perDart}} seconds per dart: typed in afterwards?', { seconds: limits.fastSecondsPerVisit, perDart: limits.trainingFastSecondsPerDart }) },
    { id: 'bestJump', level: 'suspicious', title: t('A sudden jump'), description: t('A personal best {{jump}} better than the best of the {{trainings}} trainings and more before.', { jump: percent(limits.personalBestJump), trainings: limits.personalBestHistory }) },
    { id: 'padding', level: 'suspicious', title: t('The opponent hardly threw'), description: t('{{share}} of the opponent\'s visits and more without a score: a win against a dummy?', { share: percent(limits.paddingShare) }) },
    { id: 'ownPlayers', level: 'suspicious', title: t('Players of the same account against each other'), description: t('Several players of one login in a game: wins, badges and the rating padded?') },
    { id: 'ratingFarming', level: 'suspicious', title: t('The same win again and again'), description: t('{{wins}} wins and more within {{hours}} hours against a guest or a player who hardly plays otherwise.', { wins: limits.farmingWins, hours: limits.farmingHours }) },
    { id: 'tinyBurst', level: 'suspicious', title: t('Many tiny games in a short time'), description: t('{{games}} games and more of at most {{darts}} darts within {{minutes}} minutes: club badges and goals padded?', { games: limits.tinyGames, darts: limits.tinyGameDarts, minutes: limits.tinyMinutes }) },
    { id: 'deletesLosses', level: 'suspicious', title: t('Asks to delete the games they lose'), description: t('{{requests}} deletion requests and more, {{share}} of them and more for games the player lost.', { requests: limits.deletionRequests, share: percent(limits.deletionLostShare) }) },
    { id: 'birthLater', level: 'suspicious', title: t('Made themselves younger'), description: t('A player moved their own date of birth later by more than {{days}} days; games played as an adult may then count as played as a child.', { days: limits.birthLaterDays }) },
];
