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
            'Forgot your password? Reset it by email.',
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
