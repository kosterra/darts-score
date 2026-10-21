import { Link } from 'react-router-dom';
import { FaUserPen, FaPeopleGroup, FaBullseye, FaChartLine, FaMedal, FaBell, FaUserPlus, FaSliders, FaScaleBalanced, FaTableCellsLarge, FaArrowRightArrowLeft, FaKey, FaGlobe } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';
import { PiClockCountdownBold } from 'react-icons/pi';

/**
 * The manuals on the About page: what every player can do, and what the
 * admins of a club look after. Each topic: { title, icon, body }.
 */
export const PLAYER_GUIDE = [
    {
        title: 'Your account and your clubs',
        icon: FaPeopleGroup,
        body: (
            <>
                <p>An account can belong to several clubs. The club you work in is shown at the top of the menu; tap it to switch to another one, or open <Link to="/my-clubs">My clubs</Link>.</p>
                <ul>
                    <li>Everything under <strong>Club</strong> in the menu belongs to the selected club: its players, games, trainings and badges.</li>
                    <li>A club admin gives you a login for your player in their club. Then you can start games and trainings on your own and see the club like everyone else; only admins change it.</li>
                    <li>Or you join a club yourself: under <strong>Join a club</strong> on <Link to="/my-clubs">My clubs</Link> are the clubs that take new members. An <em>open</em> club you join at once; where the <em>admins accept</em> you ask (with a few words if you like) and are told their answer through the notifications. You can take a request back while it waits; after a declined one you can ask again a week later. You play there with the player you already have elsewhere, with your statistics, badges and flights; without one you choose a nickname.</li>
                    <li>Without an account, a <strong>quick game</strong> on the public start page tries Oche out: X01 (301 or 501, Double or Straight Out, 1, 3 or 5 legs) or Cricket (Standard or Cut-throat) for one to four players who only need a name, with the statistics of the game at the end. It stays on that device for 30 days and counts for no club.</li>
                    <li>Anyone can create a club of their own under <Link to="/my-clubs">My clubs</Link> and becomes its admin. Global admins, who look after the whole app, belong to no club.</li>
                    <li>A login lasts five hours (the installation can set another length). Ten minutes before the end a countdown asks whether to stay logged in; after logging in again you are back on the page you were on, e.g. the game being played.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Playing a game',
        icon: FaBullseye,
        body: (
            <>
                <p>Choose X01, Cricket, Elimination or Around the Clock under <strong>Let&apos;s play darts</strong>.</p>
                <ul>
                    <li>Tap the players: those who played lately come first, and a guest who is not in the club is one tap away. Drag them into the throwing order, shuffle it or let the winner of the bull-off start.</li>
                    <li>Pick the settings; the start button says what will be played. In X01 a handicap gives players of different strength their own starting score and in/out mode, with a suggestion from their recent average, level and age.</li>
                    <li>During the game enter the darts on the board or the keypad and send the visit. Undo takes the last visit back. The tips above the board show the way out or what to aim at. On the board of X01, Cricket and Elimination a dart flies to the field you tap, if you left the dart animation on in your profile; the setup can switch it on or off for everyone.</li>
                    <li>When the game is won its statistics open: the result, the moments of the game and charts. Every game is saved after each visit, so a game left running can be continued from <strong>Games</strong> or the dashboard.</li>
                    <li>A game that should not count, e.g. one entered by mistake: ask to delete it with the flag in its row under <strong>Games</strong>. The other players are asked to agree; when every player has a login and all agree, it is deleted, otherwise a club admin decides. You are told how it ended.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Training',
        icon: PiClockCountdownBold,
        body: (
            <>
                <p>Under <strong>Training</strong> there are Around the Clock and X01 against the bot.</p>
                <p><strong>X01 against the bot</strong> plays like a game against a bot: a fixed one (Easy, Normal, Hard or Pro), or one as strong as you, worked out from your statistics (your recent form or your X01 average and your checkout rate), also a bit easier or harder than you. Choose the player, the format and who starts as in X01. The bot throws its darts by itself; trainings count for no game statistics, badges or levels, but earn flight points.</p>
                <p><strong>Around the Clock</strong>: choose the players, the training (against the clock or with the fewest darts) and the mode, then start.</p>
                <ul>
                    <li>Against the clock the stopwatch shows your personal best and whether you are ahead of it; stop it with the last hit and save the time.</li>
                    <li>With the fewest darts tap Hit or Miss for every dart; several players take turns.</li>
                    <li>After saving you stay in the training for the next attempt; the scoreboard shows where the attempt landed. Settings goes back to the setup.</li>
                </ul>
                <p className="m-0"><strong>Club → Trainings</strong> lists the trainings of both kinds, with the result; <strong>Mine</strong> shows only yours, and your own you can delete there. Under Player profile, <em>Show my trainings to the club</em> decides whether the other players see them (in the list and on the scoreboard); the club admins always do.</p>
            </>
        ),
    },
    {
        title: 'Statistics and comparing',
        icon: FaChartLine,
        body: (
            <>
                <ul>
                    <li><strong>My statistics</strong>, right below Dashboard, opens your own statistics in the club with one click; the <strong>You</strong> widget on the dashboard shows your level, average and form. On your user profile you choose what opens after logging in: the club (your default club, or the one you used last) and its dashboard or your statistics.</li>
                    <li><strong>Players</strong> opens each player&apos;s profile: key figures, level, their set of darts, latest games, charts, badges and the flights and barrels they collected, with filters for the club, the period, the last games and the X01 format.</li>
                    <li><strong>Player comparison</strong> puts two or more players side by side, with their games together and head to head.</li>
                    <li>The <strong>dashboard</strong> shows the club at a glance: leaderboards, the latest games, records and the Hall of Shame, in widgets the club arranges. <strong>Edit dashboard</strong> arranges your own: drag the widgets by their bar (or move them with the arrow keys), choose their width, remove them, or add others below; only you see it, and &quot;Use the club&apos;s&quot; brings the club&apos;s back.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Levels and badges',
        icon: FaMedal,
        body: (
            <p className="m-0">
                Every player has a level from Rookie to Legend, made of XP for playing, winning, badges and skill, and the 3-dart average has its own level from Beginner to Elite: see <Link to="#levels">Levels</Link>.
                Badges are earned automatically in games and trainings; all of them are listed under <Link to="#badges">Badges</Link>, and your own collection is on your profile and under <Link to="/badges">Club → Badges</Link>.
                The levels also open flights and barrels to unlock with flight points: what each level opens, and how the points are earned, is under <Link to="#levels">Levels</Link>.
            </p>
        ),
    },
    {
        title: 'Your profile, clubs and notifications',
        icon: FaBell,
        body: (
            <>
                <p>Tap your name at the bottom of the menu: it opens User profile, Player profile, My clubs, Notifications and Log out. The number on your avatar counts the notifications you have not read.</p>
                <ul>
                    <li><strong>User profile:</strong> your account: name, email and password (your name is also the name of your player), and what opens after logging in: your default club, and its dashboard or your statistics.</li>
                    <li><strong>Player profile:</strong> how you appear in your clubs. Your nickname and picture are yours to keep up to date (the picture also shows on your avatar), the date of birth is set by your club admins, and as an adult you can correct it (never to a date under 18, or the Hall of Shame age of your clubs). Here too: whether your nickname appears on the public start page, whether the other players see your trainings, the favourite double and main treble the X01 tips aim at (automatic from your games, or set by you), and your darts (see Your darts).</li>
                    <li><strong>My clubs:</strong> the clubs you play in or run, to switch between them; your name there opens your statistics and badges.</li>
                    <li><strong>Notifications:</strong> you are told when a player asks to delete a game you played (open it to agree or decline) and how the request ended, and when an admin deletes or repairs one of your games or trainings for fair play, with the reason. Open leads to the game or the request; mark them as read or remove them.</li>
                </ul>
            </>
        ),
    },
];

PLAYER_GUIDE.push({
    title: 'Your darts',
    icon: GiDart,
    body: (
        <>
            <p>On your <Link to="/player-profile">player profile</Link>, under <strong>Flights and barrels</strong>, you choose the darts you throw with in the app. They show wherever you play:</p>
            <ul>
                <li><strong>Dart animation:</strong> on the board of X01, Cricket and Elimination a dart flies to the field you tap and sticks there; switched off (as it is to begin with), the field just lights up. The setup of a game can switch it on or off for everyone.</li>
                <li><strong>Flights:</strong> the colour (your colour of the game or one of ten), the shape and the design; and the <strong>barrel</strong>. Your flight sits next to your name in the throwing order and the game header, your set of darts on your statistics.</li>
                <li><strong>Flight points:</strong> every finished game and training earns points, wins, 180s and checkouts of 100 or more earn extra. Spend them on the shapes, designs and barrels you like; the tiles show the price, in gold once you can pay it.</li>
                <li>Many flights also need a player level or an X01 average first, greyed out until then; the master flights belong to the levels (see <Link to="#levels">Levels</Link>). The legendary ones cannot be bought: they come with a feat, e.g. a nine-darter.</li>
                <li>Next to your badges you see what you collected and the points you have left.</li>
            </ul>
        </>
    ),
});

export const ADMIN_GUIDE = [
    {
        title: 'Setting up a club',
        icon: FaSliders,
        body: (
            <>
                <p>Create a club under <Link to="/my-clubs">My clubs</Link>. <strong>Edit club</strong> there opens the page of a club you run, laid out as the player profile:</p>
                <ul>
                    <li><strong>The club:</strong> the logo, the name and a description, saved with Save.</li>
                    <li><strong>Admins:</strong> share the club with other admins by their email. Every admin can do everything in the club; a club always keeps one.</li>
                    <li><strong>Public page:</strong> whether the club appears on the public start page, with its running games and its results.</li>
                    <li><strong>New members:</strong> whether people with an account join at once, ask and wait for an admin, or are only added by the admins (see below).</li>
                    <li><strong>Hall of Shame:</strong> on or off, and whether children are left out of it (under 16, or another age). A player without a date of birth is always left out of it.</li>
                    <li>These settings are saved as soon as they change. At the bottom the club can be deleted, once its players are removed.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Players and their logins',
        icon: FaUserPlus,
        body: (
            <>
                <p>Add the club&apos;s players under <strong>Club → Players</strong>: a nickname, the name, a picture and the date of birth (for the handicap suggestion and the Hall of Shame: a player without one is never in it). The edit button opens a page of the player: their details, whether their nickname is public, their login, and their ways out and darts.</p>
                <ul>
                    <li><strong>Login:</strong> give a player a login with their email, so they can start games and trainings on their own. With mail set up they get a mail to choose their password; otherwise set an initial password and pass it on.</li>
                    <li>A player with a login keeps their name (from their account), nickname and picture up to date themselves; you still set the date of birth, which adults may correct (never to a child&apos;s). Removing the login hands everything back to you.</li>
                    <li>You can add yourself as a player of a club you manage, under My clubs, to be picked for games like anyone else.</li>
                    <li>A nickname only appears on the public start page when it is set to public, by you or by the player.</li>
                    <li>For a player without a login you also choose their darts on their page, and unlock flights and barrels with their flight points.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Several clubs',
        icon: FaArrowRightArrowLeft,
        body: (
            <>
                <p>A player can be a member of several clubs, with one profile and the badges from every club. Admins of more than one club move a player to another of their clubs, add them to a second one or remove them from a club, under Clubs on the player&apos;s edit page (the edit button in Club → Players).</p>
                <ul>
                    <li>Moving takes the history along: games in which every player left the old club for the same new club move with them, and so do the trainings of a player who now plays in one club only.</li>
                    <li>Games with a player still in the old club stay there. Removing a player from a club keeps their games in it.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Games, trainings and the dashboard',
        icon: FaTableCellsLarge,
        body: (
            <ul className="m-0">
                <li><strong>Club → Games</strong> and <strong>Trainings</strong> list everything played, with filters (Around the Clock and X01 against the bot together); admins delete single games or several at once, together with the badges earned in them, and see the trainings players keep to themselves. Players delete their own trainings.</li>
                <li>A player can ask to delete a game they played (the flag in its row). The other players are asked to agree; when every player has a login and all agree, it goes by itself, otherwise you decide: open the request from the notification or the flag, then delete the game or keep it, with a note for the players. <strong>Deletion asked</strong> shows the games waiting.</li>
                <li>The admins are told through the notifications when a player asks to delete a game, and when another admin deletes or repairs a game for fair play.</li>
                <li><strong>Edit dashboard</strong> arranges the club&apos;s dashboard right on the page (switch to &quot;The club&apos;s dashboard&quot;): widgets dragged into place, a third to the full width, removed or added. Everyone sees it, unless they arranged their own; &quot;Default widgets&quot; starts over.</li>
            </ul>
        ),
    },
    {
        title: 'Fair play',
        icon: FaScaleBalanced,
        body: (
            <>
                <p><strong>Club → Fair play</strong> checks every game and training. The count next to it shows what is waiting, red while something impossible is.</p>
                <ul>
                    <li><strong>Impossible:</strong> data that cannot come from darts thrown at a board, e.g. Around the Clock in a few seconds or a dart that is not on the board. Delete it, with the badges earned in it, or mark it as a false alarm with the reason.</li>
                    <li><strong>Data errors:</strong> wrong but no cheat, e.g. a score left that does not add up. Repair rebuilds the scores left of an X01 game from its darts when every leg still ends the same way.</li>
                    <li><strong>Suspicious:</strong> possible but worth a look, e.g. a world-class time, an opponent who never threw, or a player who moved their own date of birth later. Mark it as fine or keep it on the watch list; a date of birth can be restored.</li>
                    <li>Details show what was thrown, with the visit at fault marked, before you decide. The players with a login and the other admins are told when a game is deleted or repaired.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Passwords and accounts',
        icon: FaKey,
        body: (
            <p className="m-0">
                Players who forgot their password reset it from the login page by email, when mail is set up. Without mail, or when their email address does not work,
                the global admins of the installation help: they correct the email, set a new password or create a link to choose one. Changing their own name, email or password is up to the players, on their profile.
            </p>
        ),
    },
    {
        title: 'For global admins',
        icon: FaGlobe,
        body: (
            <>
                <p>Global admins look after the whole installation and belong to no club. Their menu has the lists of all clubs:</p>
                <ul>
                    <li><strong>Clubs, users and players:</strong> every club, every account (to block it, correct an email, set a password or create a link to choose one) and every player, filtered by club.</li>
                    <li><strong>Games and trainings</strong> of the clubs chosen, and <strong>Fair play</strong> across all clubs, each entry with its club.</li>
                    <li><strong>Quick games:</strong> the games played on the public start page without an account (X01 or Cricket, the players only names), with how many were started and finished per day. They count for no club and are deleted after 30 days; delete them earlier, one or many, e.g. when someone fills the list with nonsense.</li>
                    <li><strong>Alerts and error log:</strong> unusual activity, e.g. many accounts or games created at once, and errors of the app.</li>
                    <li><strong>System settings:</strong> how long a login lasts (1 to 24 hours, five by default), the banner shown to everyone, and whether the start page shows the numbers of the installation (clubs, players, games), hidden until they speak for it.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Your own player',
        icon: FaUserPen,
        body: (
            <p className="m-0">
                Being an admin does not make you a player. Add yourself as a player of the club under My clubs to play and collect badges and levels yourself.
            </p>
        ),
    },
];
