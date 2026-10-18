/**
 * What changed for players, newest first. When a release gets its version
 * number in the root package.json, give the "Next release" entry that number.
 */
const CHANGELOG = [
    {
        version: '2026.10.9',
        changes: [
            'Hall of Shame: badges nobody wants, from Bed and Breakfast and Madhouse (no longer normal badges) to Nothing Doing (an empty visit, but not when throwing at a double), Bust Master, Stuck on the Double, Whitewashed, Bottled It, Wooden Spoon and Cold Spell. In every club one player holds each of them, whoever got it last, shown on the dashboard and next to their name in X01 games, until someone else gets it or they wash it off with a good deed. They add no XP. Club admins can switch them off in the club settings, or leave children under 16 out of them.',
            '16 new badge series: training days, training streak, the full set of training modes and the sharp shooter (fewest darts on singles); ton-plus and ton-forty visits, three in a bed, bag of nuts, short legs (18, 15 and 12 darts), double top and winning the deciding leg; in Cricket the white horse, the hat trick of bulls and the marks per round; rivals (different opponents), the anniversary and 100,000 darts thrown. They count from your whole history, so many players get some right away.',
            'Global admins help users who cannot log in, e.g. because their email address does not exist: correct their name and email, set a new password, or create a link to choose one and pass it on.',
            'The users have their own page in the Admin menu, like the clubs, with a search by name or email and a club filter; Administration keeps the totals, the banner and the system.',
            'Average levels from Beginner to Elite: the average over time marks every change of level, up and down, with lines for the level reached and the next one and the level in the tooltip; the profile names the level of the 3-dart average.',
            'One tooltip style throughout the app: on charts, dartboards and the latest winners each value with its player\'s colour, and every icon button explains itself on hovering.',
            'New player selection for X01, Cricket and Elimination: tap the players (those who played lately come first, a guest is one tap away), set the throwing order by dragging or with the arrows, shuffle it or put the winner of the bull-off first. The number of players follows from the selection, and the start button shows what will be played.',
            'Solo games are gone from the game setup; playing alone will come back as training against a bot.',
            'X01 handicap for players of different strength, e.g. a parent against a child: every player gets their own starting score and in/out mode. The suggestion from each player\'s recent average, level and age is applied with one click, and every value can still be changed.',
            'Players have a date of birth, for the handicap suggestion: it is asked for when a player is added or edited, and the players list marks those who have none yet. Guests can be given an age in the handicap.',
            'Fix: Double In and Master In now really require the double (or treble) to start; before, every dart counted from the start.',
            'Fix: the number of players in the X01 setup no longer jumps back when the set or leg mode changes with it.',
        ],
    },
    {
        version: '2026.10.8',
        changes: [
            'Club admins who run several clubs move players from one of their clubs to another, add them to a second club or remove them from a club.',
            'Player comparison: the latest winners use the whole width, the games together sit next to the figures, and the better value shows its lead (e.g. 109 +22).',
            'Average over time on the profile and in the comparison: with more than 30 games one point per month (or per quarter over three years) instead of one per game.',
            'Player comparison: with more than 30 games together the legs won are added up per month (or per quarter) instead of a bar per game.',
            'Fix: "Where the darts land" now counts hits on the 2 and on the bull; they were left out on the profile, in the comparison and on the X01 game statistics.',
            '"Where the darts land" is easier to read: clearer shading, each player\'s five most hit fields as a list, and every field\'s share of the darts on hovering.',
            '"Favourite doubles": a wide ring shaded by how often each double was tried, the six most tried doubles with their checkout rate, and the best double among those tried at least 10 times.',
        ],
    },
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
