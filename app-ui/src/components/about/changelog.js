/**
 * What changed for players, newest first. When a release gets its version
 * number in the root package.json, give the "Next release" entry that number.
 */
const CHANGELOG = [
    {
        version: 'Next release',
        changes: [
            'Accounts and clubs: log in, run one or more clubs, and share a club with several admins.',
            'Players can get their own login to play and train on their own; guests can join a single game.',
            'Public start page with live scores and results of public clubs. Clubs and players decide what is shown.',
            'Club dashboard with leaderboards, a timeline of recent games and widgets each club can arrange.',
            'Badges for milestones, wins, scoring, finishes and training, with a celebration when you win.',
            'Weekly streaks: see how many weeks in a row you have played.',
            'A celebration for every 180 in X01 and Elimination, without holding up the next player.',
            'Player statistics with new key figures: first 9 average, best leg, 100+ visits, marks per round in Cricket, and Elimination statistics.',
            'Player profiles: key figures, latest games, charts and badges on one page, opened from the players list or the badges overview. Comparing players has its own page.',
            'New dashboard widgets: club key figures, an activity calendar, when the club plays, club records, head to head, games per month and club form. Reorder widgets by drag and drop.',
            'Player levels from Rookie to Legend: collect XP by playing, winning, earning badges and getting better.',
            'Forgot your password? Reset it by email.',
            'New side navigation with your profile at the bottom; on phones it opens as a drawer.',
            'Clubs can have a logo and a description.',
            'Player statistics and comparisons on one page: pick one or more players from the list.',
            'Administration page for global admins: all clubs, users and the state of the app at a glance.',
            'Players, games and trainings of your club as compact tables under Club: all games on one page with filters for type, status and player; admins can delete several games at once.',
            'New charts: average over time, form per month, scoring vs. finishing, a dartboard heatmap, favourite doubles, darts per leg, legs per game and Around the Clock progress.',
        ],
    },
    {
        version: '2026.10.2',
        changes: [
            'New logo.',
            'Player pictures in consistent sizes, without stretching.',
            'Better contrast and readability throughout the app.',
        ],
    },
    {
        version: '2026.10.1',
        changes: [
            'Crop your profile picture when uploading it.',
            '"Play again" keeps the order of the players; "Switch players" and "Shuffle players" now always change it.',
        ],
    },
    {
        version: '2026.10.0',
        changes: [
            'App and server now come as one installation.',
        ],
    },
];

export default CHANGELOG;
