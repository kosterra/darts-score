/**
 * What changed for players, newest first. When a release gets its version
 * number in the root package.json, give the "Next release" entry that number.
 */
const CHANGELOG = [
    {
        version: '2026.10.7',
        changes: [
            'Darts Score is now called Oche, after the line darts players throw from.',
            'A player can be a member of several clubs: one profile, with badges from every club. Removing a player from a club keeps their games there.',
            'Global admins add players to clubs, remove them and create new players for any club.',
            'Protection against spam: suspicious registrations and accounts creating masses of clubs, players or games are blocked, and global admins see alerts.',
            'Global admins have an error log and their own list of all clubs.',
            'New statistics after every game: the result with each player\'s key figures and a celebrated winner, the moments of the game and charts that follow it.',
            'X01 game statistics: every leg with who won it and a race to zero, and the players side by side for the game or a set.',
            'Cricket game statistics: the board at the end with who closed each number first, the race to close and the points over the game.',
            'Elimination game statistics: the race to the target with every knock-out, the knock-outs listed and a comeback when there is one.',
            'Cricket games can be started again: new games were refused by mistake.',
            'Player profiles have filters (this club or all clubs, period, last games, X01 starting score and format), opened from a filter button.',
            'The X01 card on the profile shows 180s, 160+, 140+, 120+ and 100+, and the form chart shows how often was played.',
            'The player comparison shows each player\'s current form: rising, falling or steady.',
            'The 3-dart average on profiles and in the comparison counts all darts, not only the scoring part of a leg.',
        ],
    },
    {
        version: '2026.10.6',
        changes: [
            'A banner on top of every page, set by the global admins, e.g. to mark a test environment.',
            'A picture that cannot be saved is now reported instead of showing success.',
        ],
    },
    {
        version: '2026.10.5',
        changes: [
            'Fixes logging in when Darts Score runs from the Docker image.',
            'Self-hosting with Portainer: the settings can be entered as the stack\'s environment variables.',
        ],
    },
    {
        version: '2026.10.4',
        changes: [
            'Fixes the Docker image of 2026.10.3, which stopped right after starting.',
            'Easier self-hosting: a ready-to-copy Docker Compose setup with all settings explained, including mail.',
        ],
    },
    {
        version: '2026.10.3',
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
            'Player comparison: filters by starting score, format, last games together and your own dates, and head to head in Cricket and Elimination.',
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
